import { Avatar, Text, XStack, YStack } from '@my/ui'
import { StatusChip } from 'app/features/home/components/StatusChip'
import { useUser } from '../hooks/useUser'
import { Identity } from 'app/features/home/identity'
import { ContextMenu } from 'app/features/home/components/ContextMenu'
import { ViewUserPopover } from 'app/features/home/user/ViewUserDialog'

interface Props {
  serverUrl: string
  publicKey: string
  identity: Identity | null
}

export function UserAvatar({ serverUrl, publicKey, identity }: Props) {
  const user = useUser(serverUrl, publicKey, identity)
  const options = [
    {
      label: 'View Profile',
      onPress: () => {
        // This will be handled by the ViewUserPopover trigger
      }
    },
    {
      label: 'Manage Roles',
      onPress: () => {
        // Implement manage roles functionality
      }
    },
    {
      label: 'Kick from Server',
      onPress: () => {
        // Implement kick functionality
      }
    },
    {
      label: 'Ban from Server',
      onPress: () => {
        // Implement ban functionality
      }
    }
  ]

  if (!user)
    return (
      <XStack alignItems="center" gap="$3" paddingVertical="$2">
        <Avatar circular size="$4">
          <Avatar.Fallback bc="$color8" />
        </Avatar>
      </XStack>
    )

  return (
    <ContextMenu options={options}>
      <ViewUserPopover
        user={user}
        trigger={(open) => (
          <XStack
            alignItems="center"
            borderRadius="$2"
            cursor="pointer"
            gap="$3"
            hoverStyle={{ backgroundColor: '$backgroundHover' }}
            onPress={open}
            paddingVertical="$2"
          >
            <YStack width={40} height={40} position="relative">
              <Avatar circular size="$4">
                <Avatar.Image
                  src={user.avatarUrl || 'https://placehold.co/100x100'}
                  draggable={false}
                />
                <Avatar.Fallback bc="$color8" />
              </Avatar>
              <XStack position="absolute" bottom={-5} right={-5} zIndex={10}>
                <StatusChip status={user.status} />
              </XStack>
            </YStack>
            <YStack jc="center">
              <Text
                fontWeight="600"
                color="$color"
                fontSize="$4"
                userSelect="none"
              >
                {user.nickname ?? user.username}
              </Text>
            </YStack>
          </XStack>
        )}
      />
    </ContextMenu>
  )
}
