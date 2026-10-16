import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages のリポジトリ名に合わせてベースパスを設定
  // 例: https://username.github.io/Grouping/ の場合は '/Grouping/'
  // ローカル開発時は '/' のままで問題なし
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  test: {
    environment: 'node',
  },
});
