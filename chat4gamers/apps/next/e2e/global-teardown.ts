import { existsSync, rmSync } from 'node:fs'
import { E2E_DB_PATH, E2E_FIXTURES_PATH } from './global-setup.ts'

export default async function globalTeardown() {
  if (existsSync(E2E_DB_PATH)) rmSync(E2E_DB_PATH)
  if (existsSync(E2E_FIXTURES_PATH)) rmSync(E2E_FIXTURES_PATH)
}
