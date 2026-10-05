import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

process.env.TZ = "America/New_York";

const base = "/ai-team-sdlc-sample-focus-garden/";

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      scope: base,
      manifest: {
        id: base,
        name: "Focus Garden",
        short_name: "Focus Garden",
        description:
          "A calm, private focus timer that turns completed sessions into a personal garden.",
        start_url: base,
        scope: base,
        display: "standalone",
        background_color: "#F4F1E8",
        theme_color: "#F4F1E8",
        icons: [
          {
            src: `${base}icons/icon-192.png`,
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: `${base}icons/icon-512.png`,
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: `${base}icons/maskable-192.png`,
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: `${base}icons/maskable-512.png`,
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{html,js,css,webmanifest,png,svg,wav}"],
        navigateFallback: "index.html",
        navigateFallbackDenylist: [
          /\/api(?:\/|$)/,
          /\/[^/?]+\.[^/]+$/,
          /^\/(?!ai-team-sdlc-sample-focus-garden(?:\/|$))/,
        ],
        runtimeCaching: [],
      },
    }),
  ],
  build: {
    target: "es2022",
    sourcemap: true,
  },
  test: {
    environment: "jsdom",
    exclude: ["tests/e2e/**", "node_modules/**"],
    environmentOptions: {
      jsdom: {
        url: "https://focus-garden.test/",
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/main.ts"],
    },
  },
});
