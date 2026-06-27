import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // better-sqlite3 is a native module — run each test file in its own forked
    // process (and serially) so the in-memory database is isolated per file.
    pool: "forks",
    fileParallelism: false,
    env: {
      JWT_SECRET: "test-secret-test-secret-test-secret-1234",
      SELF_HOSTED: "true",
      DB_PATH: ":memory:",
      NODE_ENV: "test",
    },
  },
});
