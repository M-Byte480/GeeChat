import { useEffect, useState } from 'react'
import {Identity} from "app/features/home/identity";
import { getUser } from '@my/api-client'

export interface UserProfile {
  publicKey: string
  username: string
  nickname: string | null
  avatarUrl: string | null
  role: 'owner' | 'admin' | 'member'
  status: 'active' | 'awaiting_to_join' | 'banned'
}
export function useUser(
  serverUrl: string,
  publicKey: string,
  identity: Identity | null
): UserProfile | null {
  const isOwn = identity?.publicKey === publicKey

  // Todo: we will have issue where the image locally updated in identity but out of sync with server until next fetch. To solve this, we can have a global user store that syncs with identity and server, and use that store in the app instead of fetching user in each component.
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    if (isOwn && identity) {
      return {
        publicKey: identity.publicKey,
        username: identity.username,
        nickname: null, // Same as below
        avatarUrl: identity.pfp ?? null,
        role: 'member',// Todo: This is not accurate, but we don't have the role info in identity for now. We can add role to identity in the future to make it accurate.
        status: 'active',
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

    getUser(serverUrl, publicKey).then((user) => {
      if (!user) return
      setProfile({
        publicKey,
        username: user.username,
        nickname: user.nickname,
        avatarUrl: user.pfp,
        role: user.role as UserProfile['role'],
        status: user.status as UserProfile['status'],
      })
    })
  }, [serverUrl, publicKey, isOwn, identity?.pfp, identity?.username])

  return profile
}