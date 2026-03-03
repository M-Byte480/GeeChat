import {YStack} from "@my/ui";
import {ServerCollapseHamburger} from "app/features/home/server-pane/ServerCollapseHamburger";
import {useState} from "react";
import {DirectMessagesButton} from "app/features/home/server-pane/DirectMessagesButton";
import {AddServerButton} from "app/features/home/server-pane/AddServerButton";
import {ServerListComponent} from "app/features/home/server-pane/ServerListComponent";

export function ServerPane() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const toggleCollapse = () => setIsCollapsed((prev) => !prev);

  return (
    <YStack
      width={isCollapsed ? 60 : 250}
      bg="$color2"
      borderRightWidth={1}
      borderColor="$borderColor"
      transition="slow"
      $gtMd={{ display: 'flex' }}
      $maxMd={{ display: 'none' }}
    >
      <ServerCollapseHamburger
        isCollapsed={isCollapsed}
        onToggle={toggleCollapse}
      />
      <DirectMessagesButton />
      <AddServerButton />
      <ServerListComponent />
    </YStack>
  );
}