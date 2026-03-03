import { YStack } from '@my/ui'
import { useState } from 'react'
import { ServerCollapseHamburger } from './ServerCollapseHamburger'
import { DirectMessagesButton } from './DirectMessagesButton'
import { AddServerButton } from './AddServerButton'
import { ServerListComponent } from './ServerListComponent'
import { AddServerDialog } from 'app/features/home/sheets/AddServerDialog'

export function ServerPane() {
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
        <ServerListComponent />
      </YStack>

      <AddServerDialog open={showAddServer} onClose={() => setShowAddServer(false)} />
    </>
  )
}
