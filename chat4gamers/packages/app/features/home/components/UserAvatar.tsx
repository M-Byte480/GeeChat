import { Avatar, XStack, YStack, Text } from "@my/ui";
import { User } from "app/features/home/types/User";
import {StatusChip} from "app/features/home/components/StatusChip";

// Note: Using { user } destructuring to avoid naming conflicts with the 'User' type
export function UserAvatar({ user }: { user: User }) {
  const { username, status, avatarUrl } = user;

  return (
    <XStack alignItems="center" gap="$3" paddingVertical="$2">
      {/* 1. Parent container must be relative to anchor the absolute child */}
      <YStack width={40} height={40} position="relative">
        <Avatar circular size="$4">
          <Avatar.Image source={{ uri: avatarUrl || 'https://placehold.co/100x100' }} />
          <Avatar.Fallback bc="$color8" />
        </Avatar>

        {/* 2. Absolute position moves the chip ON TOP of the avatar */}
        <XStack
          position="absolute"
          bottom={-5}
          right={-5}
          zIndex={10} // Ensures it stays above the image
        >
          <StatusChip status={status} />
        </XStack>
      </YStack>

      <YStack jc="center">
        <Text fontWeight="600" color="$color" fontSize="$4">
          {username}
        </Text>
        <Text>Description...</Text>
      </YStack>

    </XStack>
  );
}