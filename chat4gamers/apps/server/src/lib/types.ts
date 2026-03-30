import type { users } from '../db/schema.js'

export type AppUser = typeof users.$inferSelect

export type AppVariables = {
  user: AppUser
}

export type AppEnv = { Variables: AppVariables }
