/**
 * アプリ全体で使用する定数
 * グループカラーは最大10グループ対応（色覚多様性を考慮した配色）
 */

/** @type {Array<{bg: string, text: string, light: string}>} */
export const GROUP_COLORS = [
  { bg: '#E74C3C', text: '#FFFFFF', light: '#FDEDEC' }, // 1 レッド
  { bg: '#3498DB', text: '#FFFFFF', light: '#EAF4FB' }, // 2 ブルー
  { bg: '#2ECC71', text: '#FFFFFF', light: '#EAFAF1' }, // 3 グリーン
  { bg: '#F39C12', text: '#FFFFFF', light: '#FEF9E7' }, // 4 オレンジ
  { bg: '#9B59B6', text: '#FFFFFF', light: '#F5EEF8' }, // 5 パープル
  { bg: '#1ABC9C', text: '#FFFFFF', light: '#E8F8F5' }, // 6 ティール
  { bg: '#E91E63', text: '#FFFFFF', light: '#FCE4EC' }, // 7 ピンク
  { bg: '#795548', text: '#FFFFFF', light: '#EFEBE9' }, // 8 ブラウン
  { bg: '#0097A7', text: '#FFFFFF', light: '#E0F7FA' }, // 9 シアン
  { bg: '#558B2F', text: '#FFFFFF', light: '#F1F8E9' }, // 10 ダークグリーン
];
