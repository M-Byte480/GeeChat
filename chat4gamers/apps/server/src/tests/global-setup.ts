import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * Runs once in the main process before any test workers are forked.
 * Setting DB_PATH here means every forked worker inherits it, so all
 * tests share a single isolated temp database instead of touching the
 * real ./data/chat.db used during development.
 */
export function setup() {
  const testDbPath = join(tmpdir(), `geechat-test-${process.pid}.db`)
  process.env.DB_PATH = testDbPath
}

export function teardown() {
  if (process.env.DB_PATH) {
    try {
      rmSync(process.env.DB_PATH)
    } catch {
      // already gone — that's fine
    }
  }
}
