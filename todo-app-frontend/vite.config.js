import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { 
        enabled: true,
        type: 'module' // Thêm dòng này cho development
      },
      manifest: {
        name: "Todo App",
        short_name: "Todo",
        description: "Ứng dụng quản lý công việc",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          {
            src: "/icons/pwa-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/icons/pwa-512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      },
      // QUAN TRỌNG: Sử dụng custom service worker
      srcDir: "src",
      filename: "sw.js",
      strategies: "injectManifest", // Sử dụng injectManifest để dùng custom SW
      injectManifest: {
        injectionPoint: undefined, // Cho phép custom hoàn toàn
      },
      workbox: {
        // Chỉ định nghĩa runtime caching, không generate SW
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/tasks"),
            handler: "NetworkFirst",
            options: {
              cacheName: "tasks-cache",
              expiration: { maxEntries: 50 }
            }
          }
        ]
      }
    })
  ],
});