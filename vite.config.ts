import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    proxy: {
      // ローカル開発用: 認証プロキシがないためユーザー名をヘッダーで設定する
      // (本番では traQ 認証プロキシがこのヘッダーを設定する)
      "/api/ws": {
        target: "ws://localhost:3000",
        ws: true,
        headers: {
          "X-Forwarded-User": process.env.DEV_USER_NAME || "cp20",
        },
      },
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        headers: {
          "X-Forwarded-User": process.env.DEV_USER_NAME || "cp20",
        },
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/ws": {
        target: "ws://localhost:3000",
        ws: true,
        headers: {
          "X-Forwarded-User": process.env.DEV_USER_NAME || "cp20",
        },
      },
    },
  },
});
