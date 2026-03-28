import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/tests/**/*.test.ts'],

    // globalSetup runs in the main process before workers are forked.
    // It sets DB_PATH so the forked worker inherits a temp DB path instead
    // of using the development database at ./data/chat.db.
    globalSetup: './src/tests/global-setup.ts',

    // forks mode (child_process.fork) inherits env vars from the parent —
    // the env var set in globalSetup is visible here.
    // singleFork means all test files share one process and therefore one DB.
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },

    environment: 'node',
    reporter: 'verbose',
  },
})
