import { XStack, Spacer, Button } from '@my/ui'
import { Users } from '@tamagui/lucide-icons'
import { ChannelTitle } from './ChannelTitle'
import { ChannelDescription } from './ChannelDescription'

type Props = {
  showMemberPane: boolean
  onToggleMemberPane: () => void
}

export function ChannelBanner({ showMemberPane, onToggleMemberPane }: Props) {
  return (
    <XStack
      bg="$gray2"
      px="$4"
      py="$2"
      borderRadius="$3"
      alignItems="center"
      gap="$3"
    >
      <ChannelTitle />
      <ChannelDescription />
      <Spacer flex={1} />
      <Button
        size="$3"
        chromeless
        icon={Users}
        onPress={onToggleMemberPane}
        color={showMemberPane ? '$color' : '$color10'}
        backgroundColor={showMemberPane ? '$color4' : 'transparent'}
        borderRadius="$3"
        animation="quick"
      />
    </XStack>
  )
}
