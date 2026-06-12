import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages はサブパス（/<repo>/）配下で配信されるため base を合わせる。
// ローカル開発や別ホスティングでは BASE_PATH=/ を渡して上書きできる。
const base = process.env.BASE_PATH ?? "/MLIT-LINKS-akiya-machi-kurabe/";

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
    // Recharts は遅延ロード（別チャンク）なので初期ロードには載らない。
    // 意図的に大きいチャンクなので警告閾値を上げてノイズを抑える。
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Recharts/D3 系は大きいので別チャンクにしてキャッシュ効率を上げる
          charts: ["recharts"],
          react: ["react", "react-dom"],
        },
      },
    },
  },
});
