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
        type: 'module'
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
      srcDir: "src",
      filename: "sw.js",
      strategies: "injectManifest",
      injectManifest: {
        injectionPoint: undefined,
      },
      workbox: {
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
  // Cấu hình build cho deployment
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          calendar: ['react-calendar']
        }
      }
    }
  },
  // Cấu hình preview server
  preview: {
    port: 5173,
    host: true
  }
});