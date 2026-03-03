import {XStack, YStack} from "@my/ui";
import {UserMockItem} from "app/features/home/user/UserMockItem";

export function MemberPane () {
  return (
    <YStack background={"#1e1e1e"} alignItems="center" px={"$2.5"}>
      <UserMockItem />
      <UserMockItem />
      <UserMockItem />
      <UserMockItem />
      <UserMockItem />
      <UserMockItem />
      <UserMockItem />
      <UserMockItem />
    </YStack>
  )
}