import {Text} from "@my/ui";

export function ChannelDescription({children}: {children?: string}) {
  return (
    <Text
      fontSize="$2"
      color="$color"
      opacity={0.8}
    >
      {children}
    </Text>
  )
}