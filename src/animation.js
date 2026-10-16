/**
 * 2D Canvas アニメーションエンジン
 *
 * フェーズ:
 *   0 Scatter  (0.0〜0.8s)  ボールが画面外から中央付近へ飛び込む
 *   1 Vortex   (0.8〜2.8s)  渦を巻いて回転
 *   2 Explode  (2.8〜4.6s)  グループ位置へ easeOutBack で飛散（バウンス効果付き）
 *
 * zoom / pan:
 *   - マウスホイール、ピンチで拡縮（0.3x〜4.0x）
 *   - ドラッグ / スワイプで移動
 *   - Canvas 内のみ scroll を抑制
 */

import { GROUP_COLORS } from './constants.js';

// ─── フェーズの境界 (秒) ───────────────────────────────────────────
const PHASE_SCATTER_END = 0.8;
const PHASE_VORTEX_END  = 2.8;
const PHASE_EXPLODE_END = 4.6;

const ZOOM_MIN = 0.3;
const ZOOM_MAX = 4.0;

/**
 * イージング関数
 */
function easeOutCubic(t)   { return 1 - Math.pow(1 - t, 3); }
function easeInOutCubic(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }
function easeOutBack(t) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/**
 * ボール1個の状態
 * @typedef {{
 *   id: number, groupIndex: number,
 *   x: number, y: number,
 *   startX: number, startY: number,
 *   vortexAngle: number, vortexRadius: number,
 *   finalX: number, finalY: number,
 *   groupCenterX: number, groupCenterY: number,
 * }} Ball
 */

export class GroupingAnimator {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {() => void} onComplete
   */
  constructor(canvas, onComplete) {
    this.canvas    = canvas;
    this.ctx       = canvas.getContext('2d');
    this.onComplete = onComplete;

    /** @type {Ball[]} */
    this.balls = [];
    this.numGroups = 0;

    this.rafId     = null;
    this.startTime = null;
    this.isRunning = false;
    this.isComplete = false;

    // カメラ変換
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;

    // ドラッグ・ピンチ内部状態
    this._drag  = { active: false, startX: 0, startY: 0, lastPanX: 0, lastPanY: 0 };
    this._pinch = { active: false, startDist: 0, startZoom: 1 };

    // 現在のアニメーション状態（_drawBall で参照）
    this._animPhase = 0;
    this._animT     = 0;

    // prefers-reduced-motion
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this._bindEvents();
    this._resizeObserver = new ResizeObserver(() => this._onResize());
    this._resizeObserver.observe(canvas.parentElement || canvas);
    this._onResize();
  }

  // ─────────────────────────────────────────────────────────────────
  // 公開 API
  // ─────────────────────────────────────────────────────────────────

  /**
   * アニメーションを開始する
   * @param {Array<{ groupIndex: number, members: number[] }>} groups
   */
  start(groups) {
    this.isComplete = false;
    this.isRunning  = true;
    this.numGroups  = groups.length;

    this._buildBalls(groups);
    this.resetView();

    if (this.reducedMotion) {
      this._applyFinalPositions();
      this.isRunning  = false;
      this.isComplete = true;
      this._animPhase = 2;
      this._animT     = 1;
      this._draw();
      this.onComplete();
      return;
    }

    this.startTime = null;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame((ts) => this._tick(ts));
  }

  /** アニメーション停止・キャンバスクリア */
  stop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.isRunning = false;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  resetView() {
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;
    if (!this.isRunning && this.isComplete) this._draw();
  }

  zoomIn()  { this._applyZoom(this.zoom * 1.2,   this.canvas.width/2, this.canvas.height/2); }
  zoomOut() { this._applyZoom(this.zoom / 1.2,   this.canvas.width/2, this.canvas.height/2); }

  destroy() {
    this.stop();
    this._unbindEvents();
    if (this._resizeObserver) this._resizeObserver.disconnect();
  }

  // ─────────────────────────────────────────────────────────────────
  // 内部: ボール生成
  // ─────────────────────────────────────────────────────────────────

  _buildBalls(groups) {
    this.balls = [];
    const W = this.canvas.width;
    const H = this.canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const totalBalls = groups.reduce((s, g) => s + g.members.length, 0);
    const groupLayouts = this._calcGroupLayouts(groups, W, H);

    groups.forEach((group) => {
      const layout = groupLayouts[group.groupIndex];
      group.members.forEach((id, memberIdx) => {
        const angle  = Math.random() * Math.PI * 2;
        const dist   = Math.max(W, H) * 0.9;
        const startX = cx + Math.cos(angle) * dist;
        const startY = cy + Math.sin(angle) * dist;

        const vortexIdx    = this.balls.length;
        const vortexAngle  = (vortexIdx / totalBalls) * Math.PI * 2;
        const vortexRadius = 60 + Math.random() * 80;

        const { finalX, finalY } = layout.positions[memberIdx];

        this.balls.push({
          id, groupIndex: group.groupIndex,
          x: startX, y: startY,
          startX, startY,
          vortexAngle, vortexRadius,
          finalX, finalY,
          groupCenterX: layout.cx,
          groupCenterY: layout.cy,
        });
      });
    });
  }

  _calcGroupLayouts(groups, W, H) {
    const n       = groups.length;
    const ballR   = this._ballRadius(groups);
    const padding = ballR * 2.6;
    const cols    = Math.ceil(Math.sqrt(n));
    const rows    = Math.ceil(n / cols);
    const cellW   = W / cols;
    const cellH   = H / rows;

    const layouts = {};
    groups.forEach((group, gi) => {
      const col = gi % cols;
      const row = Math.floor(gi / cols);
      const gcx = cellW * col + cellW / 2;
      const gcy = cellH * row + cellH / 2;

      const count      = group.members.length;
      const innerCols  = Math.ceil(Math.sqrt(count));
      const innerRows  = Math.ceil(count / innerCols);

      const positions = group.members.map((_, mi) => {
        const mc = mi % innerCols;
        const mr = Math.floor(mi / innerCols);
        return {
          finalX: gcx + (mc - (innerCols - 1) / 2) * padding,
          finalY: gcy + (mr - (innerRows - 1) / 2) * padding + ballR * 1.5,
        };
      });

      layouts[gi] = { cx: gcx, cy: gcy, positions };
    });
    return layouts;
  }

  _ballRadius(groups) {
    const total = groups.reduce((s, g) => s + g.members.length, 0);
    if (total <= 20)  return 22;
    if (total <= 40)  return 18;
    if (total <= 70)  return 14;
    if (total <= 120) return 11;
    return 9;
  }

  // ─────────────────────────────────────────────────────────────────
  // 内部: アニメーションループ
  // ─────────────────────────────────────────────────────────────────

  _tick(timestamp) {
    if (!this.startTime) this.startTime = timestamp;
    const elapsed = (timestamp - this.startTime) / 1000;

    let phase, t;

    if (elapsed < PHASE_SCATTER_END) {
      phase = 0;
      t     = easeOutCubic(elapsed / PHASE_SCATTER_END);
    } else if (elapsed < PHASE_VORTEX_END) {
      phase = 1;
      t     = (elapsed - PHASE_SCATTER_END) / (PHASE_VORTEX_END - PHASE_SCATTER_END);
    } else if (elapsed < PHASE_EXPLODE_END) {
      phase = 2;
      t     = easeOutBack(
        Math.min((elapsed - PHASE_VORTEX_END) / (PHASE_EXPLODE_END - PHASE_VORTEX_END), 1)
      );
    } else {
      // アニメーション完了
      this._applyFinalPositions();
      this.isRunning  = false;
      this.isComplete = true;
      this._animPhase = 2;
      this._animT     = 1;
      this._draw();
      this.onComplete();
      return;
    }

    this._animPhase = phase;
    this._animT     = t;
    this._updatePositions(phase, t, elapsed);
    this._draw();

    this.rafId = requestAnimationFrame((ts) => this._tick(ts));
  }

  _updatePositions(phase, t, elapsed) {
    const W  = this.canvas.width;
    const H  = this.canvas.height;
    const cx = W / 2;
    const cy = H / 2;

    this.balls.forEach((ball) => {
      if (phase === 0) {
        // Scatter: 画面外 → 渦の初期位置
        const vx = cx + Math.cos(ball.vortexAngle) * ball.vortexRadius;
        const vy = cy + Math.sin(ball.vortexAngle) * ball.vortexRadius;
        ball.x = ball.startX + (vx - ball.startX) * t;
        ball.y = ball.startY + (vy - ball.startY) * t;

      } else if (phase === 1) {
        // Vortex: 渦巻き回転
        const spin  = elapsed * 2.0;
        const angle = ball.vortexAngle + spin;
        const r     = ball.vortexRadius * (1 - (t * 0.4));
        ball.x = cx + Math.cos(angle) * r;
        ball.y = cy + Math.sin(angle) * r;

      } else if (phase === 2) {
        // Explode: 渦の終端 → 最終位置（easeOutBack でバウンス）
        const spin    = PHASE_VORTEX_END * 2.0;
        const angle   = ball.vortexAngle + spin;
        const fromR   = ball.vortexRadius * 0.6;
        const fromX   = cx + Math.cos(angle) * fromR;
        const fromY   = cy + Math.sin(angle) * fromR;
        ball.x = fromX + (ball.finalX - fromX) * t;
        ball.y = fromY + (ball.finalY - fromY) * t;
      }
    });
  }

  _applyFinalPositions() {
    this.balls.forEach((ball) => { ball.x = ball.finalX; ball.y = ball.finalY; });
  }

  // ─────────────────────────────────────────────────────────────────
  // 内部: 描画
  // ─────────────────────────────────────────────────────────────────

  _draw() {
    const ctx = this.ctx;
    const W   = this.canvas.width;
    const H   = this.canvas.height;

    ctx.clearRect(0, 0, W, H);

    ctx.save();
    ctx.translate(W/2 + this.panX, H/2 + this.panY);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-W/2, -H/2);

    // グループ背景エリア（完了後のみ）
    if (this.isComplete) {
      this._drawGroupAreas();
    }

    const ballR = this._ballRadius(this._groupsFromBalls());
    this.balls.forEach((ball) => this._drawBall(ball, ballR));

    ctx.restore();
  }

  _groupsFromBalls() {
    const map = {};
    this.balls.forEach((b) => {
      if (!map[b.groupIndex]) map[b.groupIndex] = { groupIndex: b.groupIndex, members: [] };
      map[b.groupIndex].members.push(b.id);
    });
    return Object.values(map);
  }

  _drawBall(ball, r) {
    const ctx   = this.ctx;
    const color = GROUP_COLORS[ball.groupIndex % GROUP_COLORS.length];
    const phase = this._animPhase;
    const t     = this._animT;

    let bgColor, textColor;

    if (phase < 2) {
      // scatter / vortex 中：グループ色を隠す
      bgColor   = '#888888';
      textColor = '#FFFFFF';
    } else {
      // explode 以降（完了含む）：フェードイン
      const fadeT = Math.min(Math.max(t, 0), 1);
      bgColor   = this._lerpColor('#888888', color.bg, fadeT);
      textColor = color.text;
    }

    // 影
    ctx.shadowColor   = 'rgba(0,0,0,0.22)';
    ctx.shadowBlur    = 5;
    ctx.shadowOffsetY = 2;

    // ボール本体
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2);
    ctx.fillStyle = bgColor;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    ctx.shadowColor   = 'transparent';
    ctx.shadowBlur    = 0;
    ctx.shadowOffsetY = 0;

    // 番号テキスト
    const fontSize = Math.max(r * 0.9, 8);
    ctx.font          = `bold ${fontSize}px sans-serif`;
    ctx.textAlign     = 'center';
    ctx.textBaseline  = 'middle';
    ctx.fillStyle     = textColor;
    ctx.fillText(String(ball.id), ball.x, ball.y);
  }

  _drawGroupAreas() {
    const ctx    = this.ctx;
    const ballR  = this._ballRadius(this._groupsFromBalls());
    const drawn  = new Set();

    this.balls.forEach((ball) => {
      if (drawn.has(ball.groupIndex)) return;
      drawn.add(ball.groupIndex);

      const color      = GROUP_COLORS[ball.groupIndex % GROUP_COLORS.length];
      const groupBalls = this.balls.filter((b) => b.groupIndex === ball.groupIndex);
      const xs         = groupBalls.map((b) => b.x);
      const ys         = groupBalls.map((b) => b.y);
      const pad        = ballR * 1.8;
      const minX       = Math.min(...xs) - pad;
      const minY       = Math.min(...ys) - ballR * 3.0;
      const maxX       = Math.max(...xs) + pad;
      const maxY       = Math.max(...ys) + pad;

      // 背景
      ctx.beginPath();
      this._roundRect(ctx, minX, minY, maxX - minX, maxY - minY, 12);
      ctx.fillStyle   = color.light;
      ctx.fill();
      ctx.strokeStyle = color.bg;
      ctx.lineWidth   = 2;
      ctx.stroke();

      // グループ名
      const lfs = Math.max(ballR * 1.0, 11);
      ctx.font          = `bold ${lfs}px sans-serif`;
      ctx.textAlign     = 'center';
      ctx.textBaseline  = 'middle';
      ctx.fillStyle     = color.bg;
      ctx.fillText(`グループ ${ball.groupIndex + 1}`, (minX + maxX) / 2, minY + ballR * 1.2);
    });
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h,     x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y,         x + r, y);
    ctx.closePath();
  }

  _lerpColor(from, to, t) {
    const f  = this._hexToRgb(from);
    const tt = this._hexToRgb(to);
    const r  = Math.round(f.r + (tt.r - f.r) * t);
    const g  = Math.round(f.g + (tt.g - f.g) * t);
    const b  = Math.round(f.b + (tt.b - f.b) * t);
    return `rgb(${r},${g},${b})`;
  }

  _hexToRgb(hex) {
    const m = hex.replace('#', '').match(/.{2}/g);
    return { r: parseInt(m[0], 16), g: parseInt(m[1], 16), b: parseInt(m[2], 16) };
  }

  // ─────────────────────────────────────────────────────────────────
  // 内部: リサイズ
  // ─────────────────────────────────────────────────────────────────

  _onResize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    this.canvas.width  = rect.width  || 600;
    this.canvas.height = rect.height || 400;
    if (this.isComplete) this._draw();
  }

  // ─────────────────────────────────────────────────────────────────
  // 内部: ズーム/パン
  // ─────────────────────────────────────────────────────────────────

  _applyZoom(newZoom, pivotX, pivotY) {
    const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom));
    const W = this.canvas.width;
    const H = this.canvas.height;
    const ratio = clamped / this.zoom;
    this.panX = (this.panX - (pivotX - W/2)) * ratio + (pivotX - W/2);
    this.panY = (this.panY - (pivotY - H/2)) * ratio + (pivotY - H/2);
    this.zoom = clamped;
    if (!this.isRunning) this._draw();
  }

  // ─────────────────────────────────────────────────────────────────
  // 内部: イベント
  // ─────────────────────────────────────────────────────────────────

  _bindEvents() {
    const c = this.canvas;

    this._onWheel = (e) => {
      e.preventDefault();
      const rect   = c.getBoundingClientRect();
      const factor = e.deltaY < 0 ? 1.12 : 1/1.12;
      this._applyZoom(this.zoom * factor, e.clientX - rect.left, e.clientY - rect.top);
    };
    c.addEventListener('wheel', this._onWheel, { passive: false });

    this._onMouseDown = (e) => {
      if (e.button !== 0) return;
      this._drag = { active: true, startX: e.clientX, startY: e.clientY,
                     lastPanX: this.panX, lastPanY: this.panY };
      c.style.cursor = 'grabbing';
    };
    this._onMouseMove = (e) => {
      if (!this._drag.active) return;
      this.panX = this._drag.lastPanX + (e.clientX - this._drag.startX);
      this.panY = this._drag.lastPanY + (e.clientY - this._drag.startY);
      if (!this.isRunning) this._draw();
    };
    this._onMouseUp = () => {
      this._drag.active  = false;
      c.style.cursor = 'grab';
    };
    c.addEventListener('mousedown',   this._onMouseDown);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mouseup',   this._onMouseUp);

    this._onTouchStart = (e) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        this._drag = { active: true, startX: t.clientX, startY: t.clientY,
                       lastPanX: this.panX, lastPanY: this.panY };
        this._pinch.active = false;
      } else if (e.touches.length === 2) {
        e.preventDefault();
        this._drag.active       = false;
        this._pinch.active      = true;
        this._pinch.startDist   = this._touchDist(e.touches);
        this._pinch.startZoom   = this.zoom;
      }
    };
    this._onTouchMove = (e) => {
      if (e.touches.length === 2 && this._pinch.active) {
        e.preventDefault();
        const dist   = this._touchDist(e.touches);
        const pivotX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const pivotY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const rect   = c.getBoundingClientRect();
        this._applyZoom(this._pinch.startZoom * (dist / this._pinch.startDist),
                        pivotX - rect.left, pivotY - rect.top);
      } else if (e.touches.length === 1 && this._drag.active) {
        const t = e.touches[0];
        this.panX = this._drag.lastPanX + (t.clientX - this._drag.startX);
        this.panY = this._drag.lastPanY + (t.clientY - this._drag.startY);
        if (!this.isRunning) this._draw();
      }
    };
    this._onTouchEnd = () => {
      this._drag.active  = false;
      this._pinch.active = false;
    };

    c.addEventListener('touchstart', this._onTouchStart, { passive: true });
    c.addEventListener('touchmove',  this._onTouchMove,  { passive: false });
    c.addEventListener('touchend',   this._onTouchEnd,   { passive: true });

    c.style.cursor = 'grab';
  }

  _unbindEvents() {
    const c = this.canvas;
    c.removeEventListener('wheel',      this._onWheel);
    c.removeEventListener('mousedown',  this._onMouseDown);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mouseup',   this._onMouseUp);
    c.removeEventListener('touchstart', this._onTouchStart);
    c.removeEventListener('touchmove',  this._onTouchMove);
    c.removeEventListener('touchend',   this._onTouchEnd);
  }

  _touchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx*dx + dy*dy);
  }
}
