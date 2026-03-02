import { Button, YStack, Avatar } from "@my/ui";
import {AvatarButton} from "app/features/home/components/AvatarButton";

// Mock data: items are plain objects for now
const servers = [{}, {}, {}, {}];

export function ServerListComponent() {
  return (
    <YStack space="$3" alignItems="center">
      {servers.map((server, index) => (
        <div key={index}>
          <AvatarButton />
        </div>
      ))}
    </YStack>
  );
}