import { Avatar, Text, XStack, YStack } from '@my/ui'
import { StatusChip } from 'app/features/home/components/StatusChip'
import { useUser } from '../hooks/useUser'
import { Identity } from 'app/features/home/identity'
import { ContextMenu } from 'app/features/home/components/ContextMenu'
import { ViewUserPopover } from 'app/features/home/user/ViewUserDialog'
import { KickDialog } from 'app/features/home/user/KickDialog'
import { BanDialog } from 'app/features/home/user/BanDialog'
import { useCurrentMemberRole } from 'app/features/home/hooks/useCurrentMemberRole'
import { useState } from 'react'

interface Props {
  serverUrl: string
  publicKey: string
  identity: Identity | null
}

export function UserAvatar({ serverUrl, publicKey, identity }: Props) {
  const user = useUser(serverUrl, publicKey, identity)
  const currentRole = useCurrentMemberRole(serverUrl)
  const [showKick, setShowKick] = useState(false)
  const [showBan, setShowBan] = useState(false)

  const isOwn = identity?.publicKey === publicKey
  const canModerate =
    !isOwn &&
    (currentRole === 'admin' || currentRole === 'owner') &&
    user?.role !== 'owner'

  const contextOptions = [
    { label: 'View Profile', onPress: () => {}},
    ...(canModerate
      ? [
          { label: 'Kick from Server', onPress: () => setShowKick(true) },
          { label: 'Ban from Server', onPress: () => setShowBan(true), destructive: true },
        ]
      : []),
  ]

  if (!user)
    return (
      <XStack alignItems="center" gap="$3" paddingVertical="$2">
        <Avatar circular size="$4">
          <Avatar.Fallback bc="$color8" />
        </Avatar>
      </XStack>
    )

  const displayName = user.nickname ?? user.username

  return (
    <>
      <ContextMenu options={contextOptions}>
        <ViewUserPopover
          user={user}
          currentUserRole={currentRole}
          onKick={canModerate ? () => setShowKick(true) : undefined}
          onBan={canModerate ? () => setShowBan(true) : undefined}
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
                <Text fontWeight="600" color="$color" fontSize="$4" userSelect="none">
                  {displayName}
                </Text>
              </YStack>
            </XStack>
          )}
        />
      </ContextMenu>

      <KickDialog
        open={showKick}
        onClose={() => setShowKick(false)}
        serverUrl={serverUrl}
        targetPublicKey={publicKey}
        targetName={displayName}
      />
      <BanDialog
        open={showBan}
        onClose={() => setShowBan(false)}
        serverUrl={serverUrl}
        targetPublicKey={publicKey}
        targetName={displayName}
      />
    </>
  )
}
