import { Text, YStack, XStack, Button } from "@my/ui";
import { ChevronDown } from "@tamagui/lucide-icons";

export function ServerBanner() {
  return (
    <XStack
      height={50}
      width="100%"
      px="$4"
      alignItems="center"
      justifyContent="space-between"
      borderBottomWidth={1}
      borderColor="$borderColor"
      hoverStyle={{ bg: "$backgroundPress" }}
      cursor="pointer"
      // This ensures it stays on top of the list
      bg="$backgroundHover"
    >
      <Text fontWeight="700" color="$color" fontSize="$4" numberOfLines={1}>
        Republic of Gamers
      </Text>

      {/* This represents the dropdown trigger */}
      <ChevronDown size={20} color="$color10" />
    </XStack>
  );
}