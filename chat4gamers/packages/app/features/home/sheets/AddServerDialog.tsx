import { Button, Input, Spinner, Text, XStack } from '@my/ui'
import { useState } from 'react'
import { AppDialog } from 'app/features/home/components/AppDialog'
import type { Server } from 'app/features/home/identity/types'

type Step = 'details' | 'token' | 'pending'

type Props = {
  open: boolean
  onClose: () => void
  onAddServer: (server: Server) => void
  identity: { publicKey: string; username: string; pfp?: string }
}

export function AddServerDialog({
  open,
  onClose,
  onAddServer,
  identity,
}: Props) {
  const [step, setStep] = useState<Step>('details')
  const [serverName, setServerName] = useState('')
  const [serverUrl, setServerUrl] = useState('')
  const [ownerToken, setOwnerToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Holds the validated server so we can add it after the token step
  const [pendingServer, setPendingServer] = useState<Server | null>(null)

  const reset = () => {
    setStep('details')
    setServerName('')
    setServerUrl('')
    setOwnerToken('')
    setError('')
    setLoading(false)
    setPendingServer(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const buildServer = (url: string): Server => ({
    id: crypto.randomUUID(),
    name: serverName.trim(),
    url,
  })

  const normalise = (raw: string) => {
    let url = raw.trim()
    // todo: disable this in development mode if the user is likely to be connecting to a local server without https
    if (!url.startsWith('http://') && !url.startsWith('https://'))
      url = `https://${url}`
    return url.replace(/\/$/, '')
  }

  /** Step 1 — validate URL and call /join */
  const handleAdd = async () => {
    const name = serverName.trim()
    const raw = serverUrl.trim()
    if (!name || !raw) return
    let url: string
    try {
      url = normalise(raw)
      new URL(url)
    } catch {
      setError('Invalid server address.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${url}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: identity.publicKey,
          username: identity.username,
          pfp: identity.pfp,
        }),
      })
      const data = await res.json()

      if (data.requiresToken) {
        setPendingServer(buildServer(url))
        setStep('token')
        return
      }
      if (!res.ok) {
        setError(data.error ?? 'Could not join server.')
        return
      }

      const server = buildServer(url)
      onAddServer(server)

      if (data.status === 'awaiting_to_join') {
        setPendingServer(server)
        setStep('pending')
      } else {
        handleClose()
      }
    } catch {
      setError('Could not reach the server. Check the address and try again.')
    } finally {
      setLoading(false)
    }
  }

  /** Step 2 — submit owner token */
  const handleToken = async () => {
    if (!pendingServer || !ownerToken.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${pendingServer.url}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: identity.publicKey,
          username: identity.username,
          pfp: identity.pfp,
          ownerToken: ownerToken.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Invalid token.')
        return
      }
      onAddServer(pendingServer)
      handleClose()
    } catch {
      setError('Could not reach the server.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'pending') {
    return (
      <AppDialog
        open={open}
        onClose={handleClose}
        title="Request Sent"
        description={`You've been added to the waiting list for ${serverName}. An owner must approve your request.`}
      >
        <XStack justifyContent="flex-end">
          <Button size="$4" theme="active" onPress={handleClose}>
            Got it
          </Button>
        </XStack>
      </AppDialog>
    )
  }

  if (step === 'token') {
    return (
      <AppDialog
        open={open}
        onClose={handleClose}
        title="Owner Token Required"
        description="This server has no registered owner. Enter the token printed in the server terminal to claim ownership."
      >
        <Input
          placeholder="Owner token..."
          size="$4"
          value={ownerToken}
          onChangeText={(v) => {
            setOwnerToken(v)
            setError('')
          }}
          onSubmitEditing={handleToken}
          autoCapitalize="characters"
          autoFocus
        />
        {error ? (
          <Text color="$red10" fontSize="$2">
            {error}
          </Text>
        ) : null}
        <XStack gap="$3" justifyContent="flex-end">
          <AppDialog.Cancel onPress={handleClose} />
          <Button
            size="$4"
            theme="active"
            disabled={!ownerToken.trim() || loading}
            onPress={handleToken}
            icon={loading ? <Spinner /> : undefined}
          >
            Claim Ownership
          </Button>
        </XStack>
      </AppDialog>
    )
  }

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
        onChangeText={(v) => {
          setServerUrl(v)
          setError('')
        }}
        onSubmitEditing={handleAdd}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {error ? (
        <Text color="$red10" fontSize="$2">
          {error}
        </Text>
      ) : null}
      <XStack gap="$3" justifyContent="flex-end">
        <AppDialog.Cancel onPress={handleClose} />
        <Button
          size="$4"
          theme="active"
          disabled={!serverName.trim() || !serverUrl.trim() || loading}
          onPress={handleAdd}
          icon={loading ? <Spinner /> : undefined}
        >
          Add Server
        </Button>
      </XStack>
    </AppDialog>
  )
}
