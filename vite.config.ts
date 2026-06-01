import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "dexie-sync": ["dexie", "dexie-cloud-addon", "dexie-react-hooks"]
        }
      }
    }
  },
  server: {
    host: "127.0.0.1"
  },
  test: {
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
    globals: true,
    exclude: ["tests/e2e/**", "node_modules/**", "dist/**"]
  }
});
