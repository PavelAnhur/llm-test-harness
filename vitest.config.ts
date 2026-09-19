import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    maxWorkers: 2,
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: [
      "node_modules",
      "allure-report",
      "allure-results",
      "tests/temp.test.ts",
    ],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    setupFiles: ["allure-vitest/setup"],
    reporters: [
      "default",
      ["allure-vitest/reporter", { resultsDir: "./allure-results" }],
    ],
  },
});
