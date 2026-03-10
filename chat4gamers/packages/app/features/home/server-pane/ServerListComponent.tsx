import { YStack } from '@my/ui'
import type { Server } from 'app/features/home/identity/types'
import type { ContextMenuOption } from 'app/features/home/components/ContextMenu'
import {ServerButton} from "app/features/home/server-pane/ServerButton";

type Props = {
  servers: Server[]
  activeServerId: string | null
  onSelectServer: (server: Server) => void
  serverContextOptions?: (server: Server) => ContextMenuOption[]
}

export function ServerListComponent({
                                      servers,
                                      activeServerId,
                                      onSelectServer,
                                      serverContextOptions
                                    }: Props) {
  return (
    <YStack gap="$2" alignItems="center" paddingTop="$2">
      {servers.map((server) => (
        <ServerButton
          key={server.id}
          server={server}
          isActive={server.id === activeServerId}
          onSelect={onSelectServer}
          options={serverContextOptions?.(server) ?? []}
        />
      ))}
    </YStack>
  )
}