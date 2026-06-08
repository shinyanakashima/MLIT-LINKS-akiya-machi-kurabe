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
