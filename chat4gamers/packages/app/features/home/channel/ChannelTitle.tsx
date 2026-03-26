import { Text } from '@my/ui'

export function ChannelTitle({ children }: { children: string }) {
  return <Text># {children}</Text>
}
