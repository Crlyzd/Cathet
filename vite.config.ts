import { resolve } from "path";
import { defineConfig } from "vite";

const host = process.env.TAURI_DEV_HOST || "127.0.0.1";
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5173;

// https://vitejs.dev/config/
export default defineConfig({
  // Prevent vite from obscuring rust errors
  clearScreen: false,
  // Dynamic port configuration compatible with Tauri dev
  server: {
    port,
    strictPort: true,
    host,
  },
  // Env variables starting with TAURI_ are exposed to webview
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  build: {
    // Tauri uses Chromium on Windows and WebKit on macOS/Linux
    target: process.env.TAURI_ENV_PLATFORM == "windows" ? "chrome105" : "safari13",
    // don't minify for debug builds
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        settings: resolve(__dirname, "settings.html"),
      },
    },
  },
});
