import { YStack } from '@my/ui'
import { UserMockItem } from './UserMockItem'
import type { User } from 'app/features/home/types/User'

type Props = {
  members: User[]
}

export function MemberPane({ members }: Props) {
  return (
    <YStack background="#1e1e1e" alignItems="center" px="$2.5" py="$2">
      {members.map(user => (
        <UserMockItem key={user.publicKey || user.username} user={user} />
      ))}
    </YStack>
  )
}
