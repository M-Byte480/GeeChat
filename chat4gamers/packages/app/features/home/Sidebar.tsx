import { YStack, Button, Text } from '@my/ui'
import {VoiceRoom} from "app/features/home/VoiceRoom";

export const Sidebar = ({ width = 200 }: { width?: number | string }) => (
  // @ts-ignore
  <YStack width={width} bg="$backgroundHover" borderRightWidth={1} borderColor="$borderColor" p="$4" gap="$4">
    <Text fontWeight="bold">Menu</Text>
    <Button size="$3">Channels</Button>
    <VoiceRoom />
    <Button size="$3">Direct Messages</Button>
  </YStack>
)