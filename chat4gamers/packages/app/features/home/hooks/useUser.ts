import { useEffect, useState } from 'react'
import { Identity } from 'app/features/home/identity'
import { getCachedUser, getUser } from '@my/api-client'
import { useAppStore } from 'app/features/home/hooks/useAppStore'
import type { CustomRole } from 'app/features/home/types/User'

export interface UserProfile {
  publicKey: string
  username: string
  nickname: string | null
  avatarUrl: string | null
  role: 'owner' | 'admin' | 'member'
  status: 'active' | 'awaiting_to_join' | 'banned'
  joinedAt?: string
  customRoles?: CustomRole[]
}

export function useUser(
  serverUrl: string | null,
  publicKey: string,
  identity: Identity | null
): UserProfile | null {
  const isOwn = identity?.publicKey === publicKey

  // Pull cached member data (joinedAt, role, customRoles) from the store
  const memberFromStore = useAppStore((s) =>
    serverUrl ? s.members[serverUrl]?.find((m) => m.publicKey === publicKey) : undefined
  )

  // Todo: we will have issue where the image locally updated in identity but out of sync with server until next fetch. To solve this, we can have a global user store that syncs with identity and server, and use that store in the app instead of fetching user in each component.
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    if (isOwn && identity) {
      return {
        publicKey: identity.publicKey,
        username: identity.username,
        nickname: null, // Same as below
        avatarUrl: identity.pfp ?? null,
        role: 'member', // Todo: This is not accurate, but we don't have the role info in identity for now. We can add role to identity in the future to make it accurate.
        status: 'active',
      }
    }

    const cached = getCachedUser(publicKey)
    if (cached) {
      return {
        publicKey,
        username: cached.username,
        nickname: cached.nickname,
        avatarUrl: cached.pfp,
        role: cached.role as UserProfile['role'],
        status: cached.status as UserProfile['status'],
      }
    }

    return null
  })

  useEffect(() => {
    if (isOwn && identity) {
      // Always sync from identity in case pfp or username changed
      setProfile({
        publicKey: identity.publicKey,
        username: identity.username,
        nickname: null, // Same as below
        avatarUrl: identity.pfp ?? null,
        role: 'member', // Todo: This is not accurate, but we don't have the role info in identity for now. We can add role to identity in the future to make it accurate.
        status: 'active', // Same as above, we assume own user is always active, but in reality it can be different. We can add status to identity in the future to make it accurate.
      })
      return // never fetch own user from server
    }

    if (!serverUrl) return
    getUser(serverUrl, publicKey).then((user) => {
      if (!user) return
      const stored = useAppStore.getState().members[serverUrl]?.find(
        (m) => m.publicKey === publicKey
      )
      setProfile({
        publicKey,
        username: user.username,
        nickname: user.nickname,
        avatarUrl: user.pfp,
        role: user.role as UserProfile['role'],
        status: user.status as UserProfile['status'],
        joinedAt: stored?.joinedAt,
        customRoles: stored?.customRoles,
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverUrl, publicKey, isOwn, identity?.pfp, identity?.username, memberFromStore])

  if (profile && memberFromStore) {
    return {
      ...profile,
      joinedAt: memberFromStore.joinedAt,
      customRoles: memberFromStore.customRoles,
    }
  }

  return profile
}
