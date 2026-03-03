import {Paragraph, Sheet, XStack, YStack, Text, Input, Button} from "@my/ui"


export function EditUsernameSheet({
  showEditUsername,
  setShowEditUsername,
  usernameInput,
  setUsernameInput,
  changeUsername
                                  }) {
return (
          <Sheet open={showEditUsername} onOpenChange={setShowEditUsername} modal dismissOnSnapToBottom snapPoints={[35]}>
            <Sheet.Frame p="$5" gap="$4">
              <Text fontWeight="700" fontSize="$6">Change username</Text>
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
          )
          }