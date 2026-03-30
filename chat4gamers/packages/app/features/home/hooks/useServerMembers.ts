import { useEffect } from 'react'
import type { User } from 'app/features/home/types/User'
import { UserStatus } from 'app/features/home/types/User'
import { apiFetch } from '@my/api-client'
import { useAppStore } from 'app/features/home/hooks/useAppStore'

const EMPTY_MEMBERS = []

export function useServerMembers(serverUrl: string | null): User[] {
  const members = useAppStore((s) =>
    serverUrl ? (s.members[serverUrl] ?? EMPTY_MEMBERS) : EMPTY_MEMBERS
  )
  const setMembers = useAppStore((s) => s.setMembers)

  useEffect(() => {
    if (!serverUrl) return
    if (useAppStore.getState().members[serverUrl]?.length) return

    apiFetch(`${serverUrl}`, `/members`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMembers(
            serverUrl,
            data.map((m) => ({
              username: m.username ?? 'Unknown',
              publicKey: m.publicKey ?? '',
              status: m.status ?? UserStatus.ONLINE,
              avatarUrl: m.avatarUrl,
            }))
          )
        }
      })
      .catch(() => [])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverUrl])

  return members
}
