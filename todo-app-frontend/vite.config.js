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
        theme_color: "#007bff",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/icons/pwa-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icons/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      },
      // ✅ QUAN TRỌNG: Dùng injectManifest strategy
      srcDir: "src",
      filename: "sw.js",
      strategies: "injectManifest",
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Workbox sẽ inject manifest vào vị trí này trong sw.js
        injectionPoint: undefined
      }
    })
  ],
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
  preview: {
    port: 5173,
    host: true
  }
});