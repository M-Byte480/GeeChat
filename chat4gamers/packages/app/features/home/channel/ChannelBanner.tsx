import { XStack, Spacer} from "@my/ui";
import {AvatarButton} from "app/features/home/components/AvatarButton";
import {ChannelTitle} from "app/features/home/channel/ChannelTitle";
import {ChannelDescription} from "app/features/home/channel/ChannelDescription";

export function ChannelBanner() {
  const expandUserList = () => {
    // This function would toggle the visibility of the user list sidebar
  }

  return (
    <XStack
      bg="$gray2" px="$4" py="$2" borderRadius="$3"
      alignItems="center" gap="$3"
    >
      <ChannelTitle />
      <ChannelDescription />
      <Spacer flex={1} />
      <AvatarButton onClickCallback={()=> expandUserList()} />
    </XStack>
  )
}