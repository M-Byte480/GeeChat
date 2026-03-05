import { Button, YStack, Text, Tooltip } from '@my/ui'
import type { Server } from 'app/features/home/identity/types'

type Props = {
  servers: Server[]
  activeServerId: string | null
  onSelectServer: (server: Server) => void
}

export function ServerListComponent({ servers, activeServerId, onSelectServer }: Props) {
  return (
    <YStack gap="$2" alignItems="center" paddingTop="$2">
      {servers.map((server) => {
        const isActive = server.id === activeServerId
        const initials = server.name
          .split(/\s+/)
          .slice(0, 2)
          .map(w => w[0]?.toUpperCase() ?? '')
          .join('')

        return (
          <Tooltip key={server.id} placement="right">
            <Tooltip.Trigger>
              <Button
                circular
                size="$5"
                padding={0}
                overflow="hidden"
                theme={isActive ? 'active' : undefined}
                borderWidth={isActive ? 2 : 0}
                borderColor={isActive ? '$color8' : 'transparent'}
                animation="bouncy"
                hoverStyle={{ borderRadius: '$4', scale: 1.05 }}
                onPress={() => onSelectServer(server)}
              >
                <Text fontSize="$3" fontWeight="700" color={isActive ? '$color12' : '$color11'}>
                  {initials}
                </Text>
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <Text fontSize="$2">{server.name}</Text>
            </Tooltip.Content>
          </Tooltip>
        )
      })}
    </YStack>
  )
}