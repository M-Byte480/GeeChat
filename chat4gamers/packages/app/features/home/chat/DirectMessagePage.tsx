import { YStack, Text } from '@my/ui'
import { MessageCircle } from '@tamagui/lucide-icons'

export function DirectMessagePage() {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$3">
      <MessageCircle size={48} color="$color9" />
      <Text fontSize="$5" fontWeight="600" color="$color10">Direct Messages</Text>
      <Text fontSize="$3" color="$color9">Select a conversation or start a new one.</Text>
    </YStack>
  )
}
