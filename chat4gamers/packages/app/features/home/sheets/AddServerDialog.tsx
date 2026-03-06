import { Button, Input, XStack, YStack, Text } from '@my/ui'
import { useState } from 'react'
import { AppDialog } from 'app/features/home/components/AppDialog'
import type { Server } from 'app/features/home/identity/types'

type Props = {
  open: boolean
  onClose: () => void
  onAddServer: (server: Server) => void
}

export function AddServerDialog({ open, onClose, onAddServer }: Props) {
  const [serverName, setServerName] = useState('')
  const [serverUrl, setServerUrl] = useState('')
  const [error, setError] = useState('')

  const handleClose = () => {
    setServerName('')
    setServerUrl('')
    setError('')
    onClose()
  }

  const handleAdd = () => {
    const name = serverName.trim()
    const rawUrl = serverUrl.trim()
    if (!name || !rawUrl) return

    // Normalise: ensure it starts with http:// or https://
    let url = rawUrl
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`
    }
    // Strip trailing slash
    url = url.replace(/\/$/, '')

    try {
      new URL(url) // validates the URL
    } catch {
      setError('Invalid server address.')
      return
    }

    onAddServer({ id: crypto.randomUUID(), name, url })
    handleClose()
  }

  const canAdd = serverName.trim().length > 0 && serverUrl.trim().length > 0

  return (
    <AppDialog
      open={open}
      onClose={handleClose}
      title="Add a Server"
      description="Enter a name and the server address to connect."
    >
      <Input
        placeholder="Server name..."
        size="$4"
        value={serverName}
        onChangeText={setServerName}
        autoFocus
      />
      <Input
        placeholder="Address (e.g. chat.example.com or 192.168.1.10:4000)"
        size="$4"
        value={serverUrl}
        onChangeText={(v) => { setServerUrl(v); setError('') }}
        onSubmitEditing={handleAdd}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {error ? <Text color="$red10" fontSize="$2">{error}</Text> : null}
      <XStack gap="$3" justifyContent="flex-end">
        <AppDialog.Cancel onPress={handleClose} />
        <Button size="$4" theme="active" disabled={!canAdd} onPress={handleAdd}>
          Add Server
        </Button>
      </XStack>
    </AppDialog>
  )
}
