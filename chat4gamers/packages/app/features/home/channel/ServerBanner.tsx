import { Text, XStack } from '@my/ui'
import { ChevronDown, UserCog, UserLock, Users } from '@tamagui/lucide-icons'
import { DropdownMenu } from 'app/features/home/components/DropdownMenu'
import type { DropdownOption, MemberRole } from 'app/features/home/components/DropdownMenu'
import { GearIcon } from '@livekit/components-react'

type Props = {
  serverName: string
  currentRole: MemberRole | null
  onViewJoinRequests: () => void
  onManageRoles: () => void
}

export function ServerBanner({ serverName, currentRole, onViewJoinRequests, onManageRoles }: Props) {
  const options: DropdownOption[] = [
    {
      label: 'View Join Requests',
      icon: <Users size={14} />,
      onPress: onViewJoinRequests,
      minRole: 'admin',
    },
    {
      label: 'Manage Roles',
      icon: <UserLock size={14} />,
      onPress: onManageRoles,
      minRole: 'admin',
    },
    {
      label: 'Server Settings',
      icon: <GearIcon size={14} />,
      onPress: () => {
        // Implement server settings functionality
      },
      minRole: 'owner',
    },
  ]

  return (
    <DropdownMenu
      options={options}
      currentRole={currentRole}
      trigger={(openMenu) => (
        <XStack
          height={50}
          width="100%"
          px="$4"
          alignItems="center"
          justifyContent="space-between"
          borderBottomWidth={1}
          borderColor="$borderColor"
          hoverStyle={{ bg: '$backgroundPress' }}
          cursor="pointer"
          bg="$backgroundHover"
          onPress={openMenu}
        >
          <Text fontWeight="700" color="$color" fontSize="$4" numberOfLines={1}>
            {serverName}
          </Text>
          <ChevronDown size={20} color="$color10" />
        </XStack>
      )}
    />
  )
}
