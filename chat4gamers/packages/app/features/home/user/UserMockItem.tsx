import {AvatarButton} from "app/features/home/components/AvatarButton";
import {Paragraph, XStack, YStack} from "@my/ui";

export function UserMockItem(){
    return(
      <XStack>
        <AvatarButton />
        <YStack>
          <Paragraph size="$3" >
            User Name
          </Paragraph>
          <Paragraph size="$2" >
            Last message preview...
          </Paragraph>
        </YStack>
      </XStack>
    )
}