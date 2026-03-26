import { Sheet, Text, Input, Button } from '@my/ui'

export function CreateChannelSheet({
  showCreateChannel,
  setShowCreateChannel,
  createChannelType,
  newChannelName,
  setNewChannelName,
  handleCreateChannel,
}) {
  return (
    <Sheet
      open={showCreateChannel}
      onOpenChange={setShowCreateChannel}
      modal
      dismissOnSnapToBottom
      snapPoints={[35]}
    >
      <Sheet.Frame p="$5" gap="$4">
        <Text fontWeight="700" fontSize="$6">
          New {createChannelType === 'text' ? 'Text' : 'Voice'} Channel
        </Text>
        <Input
          value={newChannelName}
          onChangeText={setNewChannelName}
          placeholder="channel-name"
          size="$4"
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={handleCreateChannel}
        />
        <Button
          theme="active"
          size="$4"
          disabled={!newChannelName.trim()}
          onPress={handleCreateChannel}
        >
          Create Channel
        </Button>
      </Sheet.Frame>
      <Sheet.Overlay />
    </Sheet>
  )
}
