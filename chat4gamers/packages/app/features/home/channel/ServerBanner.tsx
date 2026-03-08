import { Text, XStack } from '@my/ui'
import { ChevronDown, Users } from '@tamagui/lucide-icons'
import { DropdownMenu } from 'app/features/home/components/DropdownMenu'
import type { DropdownOption } from 'app/features/home/components/DropdownMenu'

type Props = {
  serverName: string
  onViewJoinRequests: () => void
}

export function ServerBanner({ serverName, onViewJoinRequests }: Props) {
  const options: DropdownOption[] = [
    {
      label:   'View Join Requests',
      icon:    <Users size={14} />,
      onPress: onViewJoinRequests,
    },
  ]

  return (
    <DropdownMenu options={options} trigger={(openMenu) => (
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
    )} />
  )
}
