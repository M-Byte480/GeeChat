import { useAppStore } from 'app/features/home/hooks/useAppStore'
import { useIdentity } from 'app/features/home/identity/IdentityContext'
import type { MemberRole } from 'app/features/home/components/DropdownMenu'

/**
 * Returns the current user's role on the given server, or null if not a member
 * or the members list hasn't loaded yet.
 */
export function useCurrentMemberRole(serverUrl: string | null): MemberRole | null {
  const { identity } = useIdentity()
  const role = useAppStore((s) =>
    serverUrl
      ? (s.members[serverUrl]?.find((m) => m.publicKey === identity.publicKey)?.role ?? null)
      : null
  )
  return role as MemberRole | null
}
