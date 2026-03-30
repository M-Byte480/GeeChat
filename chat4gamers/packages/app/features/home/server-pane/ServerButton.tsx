import { Button, Text, Tooltip } from '@my/ui'
import { ContextMenu } from 'app/features/home/components/ContextMenu'

type ServerButtonProps = {
  server: { id: string; name: string; pending?: boolean }
  isActive: boolean
  onSelect: (server: { id: string; name: string; pending?: boolean }) => void
  options: { label: string; onPress: () => void }[]
}

export function ServerButton({
  server,
  isActive,
  onSelect,
  options,
}: ServerButtonProps) {
  const initials = server.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <ContextMenu options={options}>
      <Tooltip placement="right">
        <Tooltip.Trigger>
          <Button
            circular
            size="$5"
            padding={0}
            overflow="hidden"
            opacity={server.pending ? 0.45 : 1}
            theme={isActive ? 'dark_black_accent' : undefined}
            borderWidth={isActive ? 2 : server.pending ? 2 : 0}
            borderColor={
              isActive ? '$color8' : server.pending ? '$color6' : 'transparent'
            }
            borderStyle={server.pending ? 'dashed' : 'solid'}
            hoverStyle={{
              borderRadius: '$8',
              scale: 1.02,
            }}
            onPress={() => onSelect(server)}
          >
            <Text
              fontSize="$3"
              fontWeight="700"
              color={isActive ? '$color12' : '$color11'}
            >
              {initials}
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
          <Text fontSize="$2">
            {server.name}
            {server.pending ? ' (pending)' : ''}
          </Text>
        </Tooltip.Content>
      </Tooltip>
    </ContextMenu>
  )
}
