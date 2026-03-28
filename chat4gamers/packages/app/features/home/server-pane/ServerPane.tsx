import { Button, Text, XStack, YStack } from '@my/ui'
import { useState } from 'react'
import { DirectMessagesButton } from './DirectMessagesButton'
import { AddServerButton } from './AddServerButton'
import { ServerListComponent } from './ServerListComponent'
import { AddServerDialog } from 'app/features/home/sheets/AddServerDialog'
import { AppDialog } from 'app/features/home/components/AppDialog'
import type { Server } from 'app/features/home/identity/types'
import type { ContextMenuOption } from 'app/features/home/components/ContextMenu'
import { useIdentity } from 'app/features/home/identity/IdentityContext'

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
  const [pendingDialogServer, setPendingDialogServer] = useState<Server | null>(
    null
  )
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [checkMessage, setCheckMessage] = useState<string | null>(null)
  const { updateServer } = useIdentity()

  const handleSelectServer = (server: Server) => {
    if (server.pending) {
      setCheckMessage(null)
      setPendingDialogServer(server)
      return
    }
    onSelectServer(server)
  }

  const handleCheckStatus = async () => {
    if (!pendingDialogServer) return
    setCheckingStatus(true)
    setCheckMessage(null)
    try {
      const res = await fetch(`${pendingDialogServer.url}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: identity.publicKey,
          username: identity.username,
          pfp: identity.pfp,
        }),
      })
      const data = await res.json()
      if (data.status === 'active') {
        updateServer(pendingDialogServer.id, { pending: false })
        setPendingDialogServer(null)
        onSelectServer({ ...pendingDialogServer, pending: false })
      } else {
        setCheckMessage("You haven't been approved yet. Try again later.")
      }
    } catch {
      setCheckMessage('Could not reach the server.')
    } finally {
      setCheckingStatus(false)
    }
  }

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
          onSelectServer={handleSelectServer}
          serverContextOptions={serverContextOptions}
        />
        <AddServerButton onPress={() => setShowAddServer(true)} />
      </YStack>

      <AddServerDialog
        open={showAddServer}
        onClose={() => setShowAddServer(false)}
        onAddServer={(server) => {
          onAddServer(server)
        }}
        identity={identity}
      />

      {pendingDialogServer && (
        <AppDialog
          open
          onClose={() => {
            setPendingDialogServer(null)
            setCheckMessage(null)
          }}
          title="Request Pending"
          description={`Your join request for ${pendingDialogServer.name} is awaiting approval from an admin.`}
        >
          {checkMessage ? (
            <Text color="$red10" fontSize="$2">
              {checkMessage}
            </Text>
          ) : null}
          <XStack gap="$3" justifyContent="flex-end">
            <Button
              size="$4"
              onPress={() => {
                setPendingDialogServer(null)
                setCheckMessage(null)
              }}
            >
              Dismiss
            </Button>
            <Button
              size="$4"
              theme="active"
              onPress={handleCheckStatus}
              disabled={checkingStatus}
            >
              {checkingStatus ? 'Checking…' : 'Check if approved'}
            </Button>
          </XStack>
        </AppDialog>
      )}
    </>
  )
}
