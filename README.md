# グループ分けくん 🎲

学級の総人数とグループ数を入力してランダムにグループ分けするWebアプリです。  
数字ボールが渦を巻いてグループへ飛んでいくアニメーションを楽しめます。

## スクリーンショット

| 入力画面 | アニメーション | 結果表示 |
|---------|-------------|---------|
| 人数・グループ数を入力 | ボールが渦巻いて飛散 | グループ別カードで表示 |

---

## 採用技術と選定理由

| 技術 | 用途 | 選定理由 |
|-----|------|---------|
| **Vite 5** | ビルドツール | ゼロ設定、高速HMR、GitHub Pages配置が容易 |
| **Vanilla JavaScript (ES Modules)** | アプリロジック | フレームワーク不要で保守しやすく、依存が最小 |
| **2D Canvas API** | アニメーション | ライブラリ不要、番号ボールの描画性能が高い、iPad対応が安定。Three.js（3D）は今回の用途には過剰なため不採用 |
| **Vitest** | テスト | Viteと同一設定ファイルで動作、軽量 |
| **Pure CSS + CSS Variables** | スタイリング | 依存ゼロ、カスタムプロパティでテーマ管理が容易 |

---

## 機能

- 総人数・グループ数を入力してランダムグループ分け
- **均等分配**：グループ間の人数差は最大1人（例: 32人 ÷ 5G → 7,7,6,6,6人）
- **4フェーズアニメーション**  
  `Scatter → Vortex（渦巻き）→ Explode（飛散）→ Settle（整列）`
- 番号ボールの色はアニメーション中は隠され、グループ分散後に明かされる
- ズーム（マウスホイール / ピンチ）・パン（ドラッグ / スワイプ）
- 日本語エラーメッセージ
- `prefers-reduced-motion` 対応（OS設定でアニメーション削減時は即結果表示）
- レスポンシブ対応（Windows/Mac Chrome・iPad Chrome）

---

## セットアップ

### 必要環境

- **Node.js 18以上**（推奨: LTS最新版）
- npm 9以上（Node.jsに同梱）

### インストール

```bash
git clone <リポジトリURL>
cd Grouping
npm install
```

---

## 開発サーバーの起動

```bash
npm run dev
```

ターミナルに表示された URL（例: `http://localhost:5173`）をブラウザで開いてください。

---

## テストの実行

```bash
npm test
```

`src/grouping.test.js` の以下を検証します。

- `shuffleArray` — 長さ保持・重複なし・元配列不変
- `validateInputs` — 各種異常値（未入力・小数・0以下・グループ数超過など）
- `groupStudents` — 重複なし・欠落なし・グループ数一致・人数差最大1人

ウォッチモード（変更のたびに自動テスト）:

```bash
npm run test:watch
```

---

## ビルド（本番用）

```bash
npm run build
```

`dist/` ディレクトリに静的ファイルが生成されます。

ビルド結果のローカル確認:

```bash
npm run preview
```

---

## GitHub Pages へのデプロイ

### 1. `vite.config.js` のベースパスを設定

リポジトリ名が `Grouping` の場合：

```js
// vite.config.js
base: '/Grouping/',
```

ユーザーサイト（`username.github.io`）として配置する場合：

```js
base: '/',
```

### 2. ビルド

```bash
npm run build
```

### 3. `dist/` を `gh-pages` ブランチにプッシュ

**方法A: gh-pages パッケージを使う（推奨）**

```bash
npm install --save-dev gh-pages
npx gh-pages -d dist
```

**方法B: GitHub Actions を使う**

`.github/workflows/deploy.yml` を作成：

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

リポジトリの **Settings → Pages → Source** を `gh-pages` ブランチに設定してください。

---

## プロジェクト構成

```
Grouping/
├── index.html              # HTMLエントリポイント
├── package.json
├── vite.config.js
├── README.md
└── src/
    ├── main.js             # エントリポイント（DOMContentLoaded後にUI初期化）
    ├── constants.js        # グループカラーパレット
    ├── grouping.js         # グループ分けロジック（純粋関数）
    ├── animation.js        # 2D Canvas アニメーションエンジン
    ├── ui.js               # UI状態管理・イベントハンドリング
    ├── style.css           # レスポンシブスタイル
    └── grouping.test.js    # Vitestユニットテスト
```

---

## 手動確認手順

テストが実行できない環境では以下を手動で確認してください。

| 確認項目 | 手順 |
|---------|------|
| 均等分配 | 32人5グループ → 7,7,6,6,6人になること |
| 重複・欠落なし | 1〜32番が各グループに過不足なく現れること |
| エラー表示 | 未入力・小数・0・グループ数>人数でメッセージ表示 |
| 多重スタート防止 | アニメーション中にスタートボタンが無効化されること |
| ズーム操作 | マウスホイール・ズームボタン・ピンチで拡縮できること |
| iPad タッチ | iPadのChromeでピンチ・スワイプが動作すること |
| レスポンシブ | ブラウザ幅を320px〜1200pxで変えても崩れないこと |
| アニメーション中の結果非表示 | Vortexフェーズ中にグループ色が見えないこと |

---

## 制限事項・未対応事項

- グループ名のカスタマイズ（現在は「グループ1〜N」固定）
- 結果の印刷・CSV出力
- グループ数の上限は総人数、最大10色（11グループ以上は色が循環）
- ブラウザリロードで設定・結果は消える（要件通り）

---

## ライセンス

MIT
