import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      // Disable in dev to avoid breaking the Lovable preview iframe.
      devOptions: { enabled: false },
      includeAssets: ["logo2.png", "favicon.ico", "logo.png"],
      manifest: {
        name: "Obol Accounting",
        short_name: "Obol",
        description:
          "Private accounting for single-member LLCs — track income, expenses, and run reports.",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "portrait",
        start_url: "/receipts?source=pwa",
        scope: "/",
        icons: [
          { src: "/logo2.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/logo2.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/logo2.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          {
            name: "Scan Receipt",
            short_name: "Scan",
            description: "Capture a receipt with your camera",
            url: "/receipts?action=scan",
            icons: [{ src: "/logo2.png", sizes: "192x192" }],
          },
        ],
      },
      workbox: {
        // OAuth + auth callbacks must always hit the network.
        navigateFallbackDenylist: [/^\/~oauth/, /^\/auth\//],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
}));
