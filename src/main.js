/**
 * エントリポイント
 * DOM 準備完了後に UI を初期化する
 */

import './style.css';
import { initUI } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  initUI();
});
