import { YStack } from '@my/ui'
import { UserMockItem } from './UserMockItem'
import type { User } from 'app/features/home/types/User'
import {UserAvatar} from "app/features/home/components/UserAvatar";
import {Identity} from "app/features/home/identity";

type Props = {
  members: User[]
  serverUrl: string
  identity: Identity | null
}

export function MemberPane({ members, serverUrl, identity }: Props) {
  return (
    <YStack background="#1e1e1e" alignItems="center" px="$2.5" py="$2">
      {members.map(user => (
        <UserAvatar
          key={user.publicKey}
          serverUrl={serverUrl}
          publicKey={user.publicKey}
          identity={identity}
        />
      ))}
    </YStack>
  )
}