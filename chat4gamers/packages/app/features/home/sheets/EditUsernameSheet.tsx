import { Avatar, Button, Input, Sheet, Text, XStack } from '@my/ui'
import { useState } from 'react'

export function EditProfileSheet({
  showEditUsername,
  setShowEditUsername,
  usernameInput,
  setUsernameInput,
  changeProfile,
  currentPfp,
}) {
  const [pendingPfp, setPendingPfp] = useState<string | null>(null)

  const pickImage = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') setPendingPfp(reader.result)
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  const handleSave = () => {
    const t = usernameInput.trim()
    if (!t) return
    // Single persist call — avoids the stale-closure overwrite bug where
    // two separate changePfp + changeUsername calls each spread the same
    // old identity, causing the last write to erase the first.
    changeProfile(t, pendingPfp ?? undefined)
    setPendingPfp(null)
    setShowEditUsername(false)
  }

  const previewPfp = pendingPfp ?? currentPfp

  return (
    <Sheet
      open={showEditUsername}
      onOpenChange={(open) => {
        if (!open) setPendingPfp(null)
        setShowEditUsername(open)
      }}
      modal
      dismissOnSnapToBottom
      snapPoints={[50]}
    >
      <Sheet.Frame p="$5" gap="$4">
        <Text fontWeight="700" fontSize="$6">
          Edit Profile
        </Text>

        <XStack alignItems="center" gap="$4">
          <Avatar circular size="$6">
            <Avatar.Image
              src={previewPfp || 'https://placehold.co/100x100'}
              draggable={false}
            />
            <Avatar.Fallback bc="$color8" />
          </Avatar>
          <Button size="$3" variant="outlined" onPress={pickImage}>
            Change Photo
          </Button>
        </XStack>

        <Input
          value={usernameInput}
          onChangeText={setUsernameInput}
          placeholder="New username..."
          size="$4"
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={handleSave}
        />

        <Button
          theme="active"
          size="$4"
          disabled={!usernameInput.trim()}
          onPress={handleSave}
        >
          Save
        </Button>
      </Sheet.Frame>
      <Sheet.Overlay />
    </Sheet>
  )
}
