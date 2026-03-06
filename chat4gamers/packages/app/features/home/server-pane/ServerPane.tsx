import { YStack } from '@my/ui'
import { useState } from 'react'
import { ServerCollapseHamburger } from './ServerCollapseHamburger'
import { DirectMessagesButton } from './DirectMessagesButton'
import { AddServerButton } from './AddServerButton'
import { ServerListComponent } from './ServerListComponent'
import { AddServerDialog } from 'app/features/home/sheets/AddServerDialog'
import type { Server } from 'app/features/home/identity/types'

type Props = {
  servers: Server[]
  activeServerId: string | null
  onSelectServer: (server: Server) => void
  onAddServer: (server: Server) => void
}

export function ServerPane({ servers, activeServerId, onSelectServer, onAddServer }: Props) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showAddServer, setShowAddServer] = useState(false)

  return (
    <>
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
          onToggle={() => setIsCollapsed(prev => !prev)}
        />
        <DirectMessagesButton />
        <AddServerButton onPress={() => setShowAddServer(true)} />
        <ServerListComponent
          servers={servers}
          activeServerId={activeServerId}
          onSelectServer={onSelectServer}
        />
      </YStack>

      <AddServerDialog
        open={showAddServer}
        onClose={() => setShowAddServer(false)}
        onAddServer={(server) => { onAddServer(server); setShowAddServer(false) }}
      />
    </>
  )
}
