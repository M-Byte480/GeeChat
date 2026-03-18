import {Paragraph, Sheet, XStack, YStack, Text, Input, Button, Avatar} from "@my/ui"


export function EditProfileSheet({
  showEditUsername,
  setShowEditUsername,
  usernameInput,
  setUsernameInput,
  changeUsername,
  currentPfp,
  changePfp
 }) {
  const pickImage = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') changePfp(reader.result)
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

return (
  <Sheet open={showEditUsername} onOpenChange={setShowEditUsername} modal dismissOnSnapToBottom snapPoints={[50]}>
    <Sheet.Frame p="$5" gap="$4">
      <Text fontWeight="700" fontSize="$6">Edit Profile</Text>

      {/* Avatar picker */}
      <XStack alignItems="center" gap="$4">
        <Avatar circular size="$6">
          <Avatar.Image source={{ uri: currentPfp || 'https://placehold.co/100x100' }} />
          <Avatar.Fallback bc="$color8" />
        </Avatar>
        <Button size="$3" variant="outlined" onPress={pickImage}>
          Change Photo
        </Button>
      </XStack>

      {/* Username */}
      <Input
        value={usernameInput}
        onChangeText={setUsernameInput}
        placeholder="New username..."
        size="$4"
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={() => {
          const t = usernameInput.trim()
          if (t) { changeUsername(t); setShowEditUsername(false) }
        }}
      />

      <Button
        theme="active"
        size="$4"
        disabled={!usernameInput.trim()}
        onPress={() => {
          const t = usernameInput.trim()
          if (t) { changeUsername(t); setShowEditUsername(false) }
        }}
      >
        Save
      </Button>
    </Sheet.Frame>
    <Sheet.Overlay />
  </Sheet>
)}
