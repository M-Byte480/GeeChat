import { Button } from "@my/ui";

export function DirectMessagesButton() {
  return (
    <Button
      circular
      size="$5"
      fontWeight="700"
      bg="$background"
      hoverStyle={{ bg: '$color5', scale: 1.05 }}
    >
      DM
    </Button>
  );
}