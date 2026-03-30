export { configureClient, refreshSession, authenticate, getConfig } from './challenge'
export { apiFetch } from './client'
export type { ClientConfig, SignChallengeFn } from './types'
export {
  configureAvatarStorage,
  getAvatar,
  invalidateAvatar,
  getUser,
  getCachedUser,
  invalidateUser,
} from './avatar'
