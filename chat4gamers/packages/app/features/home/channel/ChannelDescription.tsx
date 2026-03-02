import {Text} from "@my/ui";

export function ChannelDescription(){
  return (
    <Text
      fontSize="$2"
      color="$color"
      opacity={0.8}
    >
      Channel description goes here. It can be a bit longer and will wrap to multiple lines if needed.
    </Text>
  )
}