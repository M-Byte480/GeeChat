import { useState, useEffect } from 'react'
import type { User } from 'app/features/home/types/User'
import { UserStatus } from 'app/features/home/types/User'
import { apiFetch } from '@my/api-client'

export function useServerMembers(serverUrl: string | null): User[] {
  const [members, setMembers] = useState<User[]>([])

  useEffect(() => {
    if (!serverUrl) { setMembers([]); return }
    apiFetch(`${serverUrl}`, `/members`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMembers(data.map((m: any) => ({
            username: m.username ?? m.identity ?? 'Unknown',
            publicKey: m.publicKey ?? m.identity ?? '',
            status: (m.status as UserStatus) ?? UserStatus.ONLINE,
            avatarUrl: m.avatarUrl,
          })))
        }
      })
      .catch(() => setMembers([]))
  }, [serverUrl])

  return members
}
