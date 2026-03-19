// packages/app/features/home/components/MessageRowSkeleton.tsx
import { XStack, YStack } from '@my/ui'

export function MessageRowSkeleton() {
  return (
    <XStack gap="$3" paddingVertical="$2" alignItems="flex-start" opacity={0.4}>
      {/* Avatar placeholder */}
      <YStack
        width={40}
        height={40}
        borderRadius={20}
        bg="$color6"
      />
      <YStack flex={1} gap="$2">
        {/* Username + timestamp */}
        <XStack gap="$2">
          <YStack width={80} height={12} borderRadius="$2" bg="$color6" />
          <YStack width={40} height={12} borderRadius="$2" bg="$color5" />
        </XStack>
        {/* Message content lines */}
        <YStack width="75%" height={12} borderRadius="$2" bg="$color5" />
        <YStack width="50%" height={12} borderRadius="$2" bg="$color5" />
      </YStack>
    </XStack>
  )
}

// TODO: add some animation to the skeletons, maybe a shimmer effect?
/* Something like this
  width="75%"
  height={12}
  borderRadius="$2"
  bg="$color5"
  animation="slow"
  opacity={0.4}
  enterStyle={{ opacity: 0.2 }}
 */