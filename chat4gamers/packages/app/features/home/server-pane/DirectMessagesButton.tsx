import { Button, Text, Tooltip } from '@my/ui'

type Props = {
  isActive: boolean
  onPress: () => void
}

export function DirectMessagesButton({ isActive, onPress }: Props) {
  return (
    <Tooltip placement="right">
      <Tooltip.Trigger>
        <Button
          circular
          size="$5"
          padding={0}
          overflow="hidden"
          theme={isActive ? 'dark_black_accent' : undefined}
          borderWidth={isActive ? 2 : 0}
          borderColor={isActive ? '$color8' : 'transparent'}
          hoverStyle={{
            borderRadius: '$8',
            scale: 1.02,
          }}
          onPress={onPress}
        >
          <Text
            fontSize="$3"
            fontWeight="700"
            color={isActive ? '$color12' : '$color11'}
          >
            DM
          </Text>
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content
        enterStyle={{ x: -10, opacity: 0 }}
        exitStyle={{ x: -10, opacity: 0 }}
        transition={[
          'quick',
          {
            opacity: {
              overshootClamping: true,
            },
          },
        ]}
      >
        <Text fontSize="$2">Direct Messages</Text>
      </Tooltip.Content>
    </Tooltip>
  )
}
