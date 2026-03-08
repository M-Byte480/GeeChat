import { YStack, Text } from '@my/ui'
import { MessageCircle } from '@tamagui/lucide-icons'

export function DirectMessagesComponent() {
  return (
    <YStack
      flex={1}
      width={250}
      bg="$backgroundHover"
      borderRightWidth={1}
      borderColor="$borderColor"
      p="$3"
      gap="$2"
    >
      <Text fontSize="$2" fontWeight="600" color="$color10" px="$2" pb="$1">
        DIRECT MESSAGES
      </Text>
      <YStack flex={1} alignItems="center" justifyContent="center" gap="$2">
        <MessageCircle size={32} color="$color9" />
        <Text fontSize="$3" color="$color9" textAlign="center">
          No direct messages yet
        </Text>
      </YStack>
    </YStack>
  )
}
