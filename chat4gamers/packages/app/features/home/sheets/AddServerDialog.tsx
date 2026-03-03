import { Button, Input, XStack, YStack } from '@my/ui'
import { useState } from 'react'
import { AppDialog } from 'app/features/home/components/AppDialog'

type Props = {
  open: boolean
  onClose: () => void
}

export function AddServerDialog({ open, onClose }: Props) {
  const [serverName, setServerName] = useState('')

  const handleClose = () => {
    setServerName('')
    onClose()
  }

  const handleCreate = () => {
    if (!serverName.trim()) return
    // TODO: wire up to server creation API
    handleClose()
  }

  return (
    <AppDialog
      open={open}
      onClose={handleClose}
      title="Add a Server"
      description="Give your server a name to get started."
    >
      <Input
        placeholder="Server name..."
        size="$4"
        value={serverName}
        onChangeText={setServerName}
        autoFocus
        onSubmitEditing={handleCreate}
      />
      <XStack gap="$3" justifyContent="flex-end">
        <AppDialog.Cancel onPress={handleClose} />
        <Button size="$4" theme="active" disabled={!serverName.trim()} onPress={handleCreate}>
          Create Server
        </Button>
      </XStack>
    </AppDialog>
  )
}
