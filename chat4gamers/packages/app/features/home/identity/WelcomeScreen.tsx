'use client'

import { useState } from 'react'
import { Button, Input, Paragraph, Text, XStack, YStack } from '@my/ui'
import type { Identity, IdentityFile } from './types'
import { decryptIdentity, generateIdentity, serializeForStorage, } from './crypto'

type Step = 'choose' | 'create-info' | 'create-passphrase' | 'import-passphrase'

interface WelcomeElectronAPI {
  selectPfp: () => Promise<string | undefined>
  loadIdentityFile: () => Promise<string | null>
  saveIdentityFile: (json: string) => Promise<void>
  safestoreSet: (json: string) => void
}

const electronAPI = () =>
  (window as unknown as { electronAPI?: WelcomeElectronAPI }).electronAPI

// ── Web / Tauri file helpers ──────────────────────────────────────────────────

function pickFileAsText(accept: string): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsText(file)
    }
    input.oncancel = () => resolve(null)
    input.click()
  })
}

function pickFileAsDataUrl(accept: string): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(file)
    }
    input.oncancel = () => resolve(null)
    input.click()
  })
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

type Props = {
  onIdentityReady: (identity: Identity) => void
}

export function WelcomeScreen({ onIdentityReady }: Props) {
  const [step, setStep] = useState<Step>('choose')
  const [username, setUsername] = useState('')
  const [pfp, setPfp] = useState<string | undefined>()
  const [passphrase, setPassphrase] = useState('')
  const [confirmPassphrase, setConfirmPassphrase] = useState('')
  const [importedFile, setImportedFile] = useState<IdentityFile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSelectPfp = async () => {
    const dataUrl = electronAPI()?.selectPfp
      ? await electronAPI()!.selectPfp()
      : await pickFileAsDataUrl('image/*')
    if (dataUrl) setPfp(dataUrl)
  }

  const handleImportClick = async () => {
    setError(null)
    const jsonStr = electronAPI()?.loadIdentityFile
      ? await electronAPI()!.loadIdentityFile()
      : await pickFileAsText('.json,application/json')
    if (!jsonStr) return // user cancelled
    try {
      const file = JSON.parse(jsonStr) as IdentityFile
      if (file.version !== 1 || !file.publicKey || !file.encryptedPrivateKey) {
        throw new Error('Invalid identity file format')
      }
      setImportedFile(file)
      setPassphrase('')
      setStep('import-passphrase')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read identity file')
    }
  }

  const handleCreate = async () => {
    if (passphrase !== confirmPassphrase) {
      setError('Passphrases do not match')
      return
    }
    if (passphrase.length < 4) {
      setError('Passphrase must be at least 4 characters')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const { file, identity } = await generateIdentity(
        username.trim(),
        pfp,
        passphrase
      )
      const jsonContent = JSON.stringify(file, null, 2)
      if (electronAPI()?.saveIdentityFile) {
        await electronAPI()!.saveIdentityFile(jsonContent)
      } else {
        downloadTextFile(`geechat-identity-${username.trim()}.json`, jsonContent)
      }
      onIdentityReady(identity)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create identity')
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!importedFile) return
    setError(null)
    setLoading(true)
    try {
      const identity = await decryptIdentity(importedFile, passphrase)
      await electronAPI()?.safestoreSet(serializeForStorage(identity))
      onIdentityReady(identity)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to decrypt identity')
      setLoading(false)
    }
  }

  // ── Screens ──────────────────────────────────────────────────────────────

  return (
    <YStack
      flex={1}
      height="100vh"
      bg="$background"
      alignItems="center"
      justifyContent="center"
      gap="$5"
    >
      {/* Drag strip for Electron + Tauri — sits in the empty top area */}
      <XStack
        position="absolute"
        top={0}
        left={0}
        right={0}
        height={40}
        // @ts-expect-error — desktop drag region attributes
        data-tauri-drag-region
        style={{ WebkitAppRegion: 'drag', userSelect: 'none' }}
      />
      <YStack alignItems="center" gap="$2">
        <Text fontSize="$9" fontWeight="800" letterSpacing={-1} color="$color">
          GeeChat
        </Text>
        <Paragraph color="$color11" fontSize="$4">
          {step === 'choose' && 'Secure chat for gamers'}
          {step === 'create-info' && 'Set up your identity'}
          {step === 'create-passphrase' && 'Protect your identity'}
          {step === 'import-passphrase' && 'Unlock your identity'}
        </Paragraph>
      </YStack>

      {step === 'choose' && (
        <YStack width={320} gap="$3">
          <Button
            size="$5"
            theme="active"
            onPress={() => {
              setError(null)
              setStep('create-info')
            }}
          >
            Create New Identity
          </Button>
          <Button size="$5" onPress={handleImportClick}>
            Import Existing Identity
          </Button>
        </YStack>
      )}

      {step === 'create-info' && (
        <YStack width={320} gap="$3">
          <Input
            placeholder="Username..."
            size="$5"
            value={username}
            onChangeText={setUsername}
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
          />
          <XStack gap="$2" alignItems="center">
            <Button flex={1} size="$4" onPress={handleSelectPfp}>
              {pfp ? 'Change Photo' : 'Add Profile Photo (optional)'}
            </Button>
            {pfp && (
              // @ts-expect-error — native img in web/Electron
              <img
                src={pfp}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
            )}
          </XStack>
          <Button
            size="$5"
            theme="active"
            disabled={!username.trim()}
            onPress={() => {
              setError(null)
              setPassphrase('')
              setConfirmPassphrase('')
              setStep('create-passphrase')
            }}
          >
            Next
          </Button>
          <Button size="$4" chromeless onPress={() => setStep('choose')}>
            Back
          </Button>
        </YStack>
      )}

      {step === 'create-passphrase' && (
        <YStack width={320} gap="$3">
          <Input
            placeholder="Passphrase..."
            size="$5"
            value={passphrase}
            onChangeText={setPassphrase}
            secureTextEntry
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
          />
          <Input
            placeholder="Confirm passphrase..."
            size="$5"
            value={confirmPassphrase}
            onChangeText={setConfirmPassphrase}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect="off"
            onSubmitEditing={handleCreate}
          />
          <Paragraph color="$color10" fontSize="$2">
            Your passphrase encrypts your private key. Store your identity file
            safely — you'll need both to recover access on another device.
          </Paragraph>
          <Button
            size="$5"
            theme="active"
            disabled={!passphrase || loading}
            onPress={handleCreate}
          >
            {loading ? 'Creating...' : 'Create Identity'}
          </Button>
          <Button size="$4" chromeless onPress={() => setStep('create-info')}>
            Back
          </Button>
        </YStack>
      )}

      {step === 'import-passphrase' && (
        <YStack width={320} gap="$3">
          {importedFile && (
            <Paragraph color="$color11" fontSize="$3">
              Identity: <Text fontWeight="700">{importedFile.username}</Text>
            </Paragraph>
          )}
          <Input
            placeholder="Passphrase..."
            size="$5"
            value={passphrase}
            onChangeText={setPassphrase}
            secureTextEntry
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            onSubmitEditing={handleImport}
          />
          <Button
            size="$5"
            theme="active"
            disabled={!passphrase || loading}
            onPress={handleImport}
          >
            {loading ? 'Unlocking...' : 'Unlock'}
          </Button>
          <Button size="$4" chromeless onPress={() => setStep('choose')}>
            Back
          </Button>
        </YStack>
      )}

      {error && (
        <Paragraph
          color="$red10"
          fontSize="$3"
          textAlign="center"
          maxWidth={320}
        >
          {error}
        </Paragraph>
      )}
    </YStack>
  )
}
