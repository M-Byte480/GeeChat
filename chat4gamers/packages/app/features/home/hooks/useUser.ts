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

  const [profile, setProfile] = useState<UserProfile | null>(() => {
    // Seed own user immediately from identity so UI renders instantly
    // Server fetch below will fill in nickname and role
    if (isOwn && identity) {
      return {
        publicKey: identity.publicKey,
        username: identity.username,
        avatarUrl: identity.pfp ?? null,
        nickname: null,
        role: 'member',
        status: 'active',
      }
    }
    return null
  })

  useEffect(() => {
    // Always fetch — own user needs nickname + role from members table too
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
  }, [serverUrl, publicKey])

  return profile
}