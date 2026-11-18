import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.js"],
    setupFiles: ["./tests/setup/env.js"],
    // all test files share one database, so run them one at a time
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
