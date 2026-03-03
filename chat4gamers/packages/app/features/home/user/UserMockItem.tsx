import {XStack} from "@my/ui";
import {UserAvatar} from "app/features/home/components/UserAvatar";
import {UserStatus} from "app/features/home/types/User";

export function UserMockItem(){
  const user = {
    username: 'Gamer123',
    status: UserStatus.ONLINE,
    publicKey: '',
    avatarUrl: 'https://placehold.co/100x100'
  }
    return(
      <XStack>
        <UserAvatar
          user={user}
        />
      </XStack>
    )
}