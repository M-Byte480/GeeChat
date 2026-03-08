import { Button } from "@my/ui";

type Props = {
  isActive: boolean
  onPress: () => void
}

export function DirectMessagesButton({ isActive, onPress }: Props) {
  return (
    <Button
      circular
      size="$5"
      fontWeight="700"
      bg={isActive ? '$color5' : '$background'}
      hoverStyle={{ bg: '$color5', scale: 1.05 }}
      onPress={onPress}
    >
      DM
    </Button>
  );
}