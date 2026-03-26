import { YStack } from '@my/ui'
import { useState } from 'react'
import { DirectMessagesButton } from './DirectMessagesButton'
import { AddServerButton } from './AddServerButton'
import { ServerListComponent } from './ServerListComponent'
import { AddServerDialog } from 'app/features/home/sheets/AddServerDialog'
import type { Server } from 'app/features/home/identity/types'
import type { ContextMenuOption } from 'app/features/home/components/ContextMenu'

type Props = {
  servers: Server[]
  activeServerId: string | null
  onSelectServer: (server: Server) => void
  onAddServer: (server: Server) => void
  isDMsActive: boolean
  onSelectDMs: () => void
  serverContextOptions?: (server: Server) => ContextMenuOption[]
  identity: { publicKey: string; username: string; pfp?: string }
}

export function ServerPane({
  servers,
  activeServerId,
  onSelectServer,
  onAddServer,
  isDMsActive,
  onSelectDMs,
  serverContextOptions,
  identity,
}: Props) {
  const [showAddServer, setShowAddServer] = useState(false)

  return (
    <>
      <YStack
        width={60}
        bg="$color2"
        borderRightWidth={1}
        borderColor="$borderColor"
        transition="slow"
        $md={{ display: 'flex' }}
        $max-md={{ display: 'none' }}
        gap="$2"
        alignItems="center"
        paddingTop="$2"
      >
        <DirectMessagesButton isActive={isDMsActive} onPress={onSelectDMs} />
        <ServerListComponent
          servers={servers}
          activeServerId={activeServerId}
          onSelectServer={onSelectServer}
          serverContextOptions={serverContextOptions}
        />
        <AddServerButton onPress={() => setShowAddServer(true)} />
      </YStack>

      <AddServerDialog
        open={showAddServer}
        onClose={() => setShowAddServer(false)}
        onAddServer={(server) => {
          onAddServer(server)
          setShowAddServer(false)
        }}
        identity={identity}
      />
    </>
  )
}
