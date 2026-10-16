/**
 * UI 状態管理・イベントハンドリング
 *
 * 状態遷移:
 *   idle ──[start]──> running ──[complete]──> done
 *    ^                                         |
 *    └─────────────[reset / retry]────────────┘
 */

import { validateInputs, groupStudents } from './grouping.js';
import { GroupingAnimator } from './animation.js';
import { GROUP_COLORS } from './constants.js';

/** @type {'idle' | 'running' | 'done'} */
let appState = 'idle';

/** @type {GroupingAnimator | null} */
let animator = null;

/** @type {Array<{ groupIndex: number, members: number[] }> | null} */
let lastGroups = null;

/** @type {number} */
let lastTotal = 0;

/** @type {number} */
let lastNumGroups = 0;

// ─── DOM 要素参照 ────────────────────────────────────────────────────
let elTotal, elNumGroups, elStartBtn, elRetryBtn, elResetViewBtn,
    elZoomInBtn, elZoomOutBtn, elErrorMsg, elCanvas, elResultSection,
    elResultList, elForm, elCanvasSection;

/**
 * UI を初期化する（DOMContentLoaded 後に呼ぶ）
 */
export function initUI() {
  elTotal          = /** @type {HTMLInputElement} */ (document.getElementById('input-total'));
  elNumGroups      = /** @type {HTMLInputElement} */ (document.getElementById('input-groups'));
  elStartBtn       = document.getElementById('btn-start');
  elRetryBtn       = document.getElementById('btn-retry');
  elResetViewBtn   = document.getElementById('btn-reset-view');
  elZoomInBtn      = document.getElementById('btn-zoom-in');
  elZoomOutBtn     = document.getElementById('btn-zoom-out');
  elErrorMsg       = document.getElementById('error-message');
  elCanvas         = /** @type {HTMLCanvasElement} */ (document.getElementById('anim-canvas'));
  elResultSection  = document.getElementById('result-section');
  elResultList     = document.getElementById('result-list');
  elForm           = document.getElementById('input-form');
  elCanvasSection  = document.getElementById('canvas-section');

  // アニメーター生成
  animator = new GroupingAnimator(elCanvas, onAnimationComplete);

  // イベント登録
  elForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleStart();
  });

  elRetryBtn.addEventListener('click', handleRetry);
  elResetViewBtn.addEventListener('click', () => animator.resetView());
  elZoomInBtn.addEventListener('click', () => animator.zoomIn());
  elZoomOutBtn.addEventListener('click', () => animator.zoomOut());

  // キーボード操作（Canvas にフォーカス時）
  elCanvas.setAttribute('tabindex', '0');
  elCanvas.addEventListener('keydown', (e) => {
    switch (e.key) {
      case '+': case '=': animator.zoomIn(); e.preventDefault(); break;
      case '-': case '_': animator.zoomOut(); e.preventDefault(); break;
      case '0': animator.resetView(); e.preventDefault(); break;
    }
  });

  // 入力変更時にエラーをクリア
  elTotal.addEventListener('input', clearError);
  elNumGroups.addEventListener('input', clearError);

  // 初期状態を適用
  setState('idle');
}

// ─────────────────────────────────────────────────────────────────────
// ハンドラ
// ─────────────────────────────────────────────────────────────────────

function handleStart() {
  if (appState === 'running') return;

  const totalRaw  = elTotal.value.trim();
  const groupsRaw = elNumGroups.value.trim();

  // パース前に空チェック
  const totalVal  = totalRaw  === '' ? '' : Number(totalRaw);
  const groupsVal = groupsRaw === '' ? '' : Number(groupsRaw);

  const { valid, error } = validateInputs(totalVal, groupsVal);
  if (!valid) {
    showError(error);
    return;
  }

  clearError();

  const total     = Number(totalVal);
  const numGroups = Number(groupsVal);

  lastTotal     = total;
  lastNumGroups = numGroups;
  lastGroups    = groupStudents(total, numGroups);

  setState('running');
  hideResult();
  animator.start(lastGroups);
}

function handleRetry() {
  if (appState === 'running') return;

  // 前回と同じ条件で再抽選
  lastGroups = groupStudents(lastTotal, lastNumGroups);
  setState('running');
  hideResult();
  animator.start(lastGroups);
}

function onAnimationComplete() {
  setState('done');
  renderResult(lastGroups);
}

// ─────────────────────────────────────────────────────────────────────
// 状態管理
// ─────────────────────────────────────────────────────────────────────

function setState(state) {
  appState = state;

  switch (state) {
    case 'idle':
      elStartBtn.disabled   = false;
      elStartBtn.textContent = '🎲 スタート';
      elStartBtn.setAttribute('aria-busy', 'false');
      elRetryBtn.hidden      = true;
      elCanvasSection.hidden = true;
      elResetViewBtn.hidden  = true;
      elZoomInBtn.hidden     = true;
      elZoomOutBtn.hidden    = true;
      break;

    case 'running':
      elStartBtn.disabled    = true;
      elStartBtn.textContent = '⏳ 抽選中…';
      elStartBtn.setAttribute('aria-busy', 'true');
      elRetryBtn.hidden       = true;
      elCanvasSection.hidden  = false;
      elResetViewBtn.hidden   = false;
      elZoomInBtn.hidden      = false;
      elZoomOutBtn.hidden     = false;
      break;

    case 'done':
      elStartBtn.disabled    = false;
      elStartBtn.textContent = '🎲 スタート';
      elStartBtn.setAttribute('aria-busy', 'false');
      elRetryBtn.hidden       = false;
      elCanvasSection.hidden  = false;
      elResetViewBtn.hidden   = false;
      elZoomInBtn.hidden      = false;
      elZoomOutBtn.hidden     = false;
      break;
  }
}

// ─────────────────────────────────────────────────────────────────────
// 結果表示
// ─────────────────────────────────────────────────────────────────────

function renderResult(groups) {
  elResultList.innerHTML = '';

  groups.forEach((group) => {
    const color = GROUP_COLORS[group.groupIndex % GROUP_COLORS.length];
    const card  = document.createElement('div');
    card.className = 'result-card';
    card.style.setProperty('--group-bg',    color.bg);
    card.style.setProperty('--group-text',  color.text);
    card.style.setProperty('--group-light', color.light);
    card.setAttribute('role', 'region');
    card.setAttribute('aria-label', `グループ ${group.groupIndex + 1}`);

    const title = document.createElement('h3');
    title.className = 'result-card__title';
    title.textContent = `グループ ${group.groupIndex + 1}`;

    const count = document.createElement('span');
    count.className = 'result-card__count';
    count.textContent = `${group.members.length}名`;

    const memberList = document.createElement('ul');
    memberList.className = 'result-card__members';
    memberList.setAttribute('aria-label', `グループ ${group.groupIndex + 1}のメンバー`);

    // 番号を昇順にソートして表示
    const sorted = [...group.members].sort((a, b) => a - b);
    sorted.forEach((id) => {
      const li = document.createElement('li');
      li.className = 'result-card__member';
      li.textContent = `${id}番`;
      memberList.appendChild(li);
    });

    title.appendChild(count);
    card.appendChild(title);
    card.appendChild(memberList);
    elResultList.appendChild(card);
  });

  elResultSection.hidden = false;
  // スクロールして結果へ誘導
  elResultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideResult() {
  elResultSection.hidden = true;
  elResultList.innerHTML = '';
}

// ─────────────────────────────────────────────────────────────────────
// エラー表示
// ─────────────────────────────────────────────────────────────────────

function showError(message) {
  elErrorMsg.textContent = message;
  elErrorMsg.hidden      = false;
  elErrorMsg.setAttribute('role', 'alert');
}

function clearError() {
  elErrorMsg.textContent = '';
  elErrorMsg.hidden      = true;
}
