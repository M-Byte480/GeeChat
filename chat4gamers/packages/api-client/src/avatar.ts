// packages/api-client/src/avatar.ts
import { apiFetch } from './client'

type AvatarStorage = {
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, value: string) => Promise<void>
}

export interface ServerUser {
  publicKey: string
  username: string
  pfp: string | null
  nickname: string | null
  role: string
  status: string
}

const TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days

let _storage: AvatarStorage | null = null
const memoryCache = new Map<string, string>()
const userMemoryCache = new Map<string, ServerUser>()

export function configureAvatarStorage(storage: AvatarStorage) {
  _storage = storage
}

interface CachedAvatar {
  pfp: string
  cachedAt: number
}

async function readFromStorage(publicKey: string): Promise<string | null> {
  if (!_storage) return null
  try {
    const raw = await _storage.getItem(`avatar:${publicKey}`)
    if (!raw) return null
    const parsed: CachedAvatar = JSON.parse(raw)
    if (Date.now() - parsed.cachedAt > TTL_MS) return null
    return parsed.pfp
  } catch {
    return null
  }
}

async function writeToStorage(publicKey: string, pfp: string) {
  if (!_storage) return
  try {
    const entry: CachedAvatar = { pfp, cachedAt: Date.now() }
    await _storage.setItem(`avatar:${publicKey}`, JSON.stringify(entry))
  } catch {
    // storage full or unavailable — memory cache still works
  }
}

export async function getAvatar(
  serverUrl: string,
  publicKey: string
): Promise<string | null> {
  // 1. Memory cache — fastest
  if (memoryCache.has(publicKey)) return memoryCache.get(publicKey) ?? null

  // 2. Persistent storage — survives restarts
  const stored = await readFromStorage(publicKey)
  if (stored) {
    memoryCache.set(publicKey, stored)
    return stored
  }

  // 3. Fetch from server
  try {
    const res = await apiFetch(serverUrl, `/users/${publicKey}/avatar`)
    if (!res.ok) return null
    const { pfp } = await res.json()
    if (!pfp) return null

    memoryCache.set(publicKey, pfp)
    await writeToStorage(publicKey, pfp)
    return pfp
  } catch {
    return null
  }
}

export function invalidateAvatar(publicKey: string) {
  memoryCache.delete(publicKey)
  _storage?.setItem(`avatar:${publicKey}`, '') // clear persisted too
}

export async function getUser(
  serverUrl: string,
  publicKey: string
): Promise<ServerUser | null> {
  if (userMemoryCache.has(publicKey))
    return userMemoryCache.get(publicKey) ?? null

  try {
    const res = await apiFetch(serverUrl, `/users/${publicKey}`)
    if (!res.ok) return null
    const user = await res.json()
    userMemoryCache.set(publicKey, user)
    return user
  } catch {
    return null
  }
}

export function getCachedUser(publicKey: string): ServerUser | null {
  return userMemoryCache.get(publicKey) ?? null
}

export function invalidateUser(publicKey: string) {
  userMemoryCache.delete(publicKey)
  memoryCache.delete(publicKey)
  _storage?.setItem(`avatar:${publicKey}`, '')
}
