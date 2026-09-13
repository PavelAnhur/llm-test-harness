import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules", "allure-report", "allure-results"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    reporters: ["default"],
    setupFiles: [],
  },
});
