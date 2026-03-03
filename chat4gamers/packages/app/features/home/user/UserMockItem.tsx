import { XStack } from '@my/ui'
import { UserAvatar } from 'app/features/home/components/UserAvatar'
import type { User } from 'app/features/home/types/User'

export function UserMockItem({ user }: { user: User }) {
  return (
    <XStack>
      <UserAvatar user={user} />
    </XStack>
  )
}
