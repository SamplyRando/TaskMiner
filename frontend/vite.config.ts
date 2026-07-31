import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    proxy: {
      "/api": {
        changeOrigin: true,
        target: "http://127.0.0.1:8000",
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: [
        "src/api/dashboard.ts",
        "src/features/dashboard/**/*.ts",
        "src/components/dashboard/**/*.tsx",
        "src/components/empty-state.tsx",
        "src/components/ui/progress.tsx",
        "src/pages/home-page.tsx",
      ],
      thresholds: {
        branches: 95,
        functions: 95,
        lines: 95,
        statements: 95,
      },
    },
  },
});
