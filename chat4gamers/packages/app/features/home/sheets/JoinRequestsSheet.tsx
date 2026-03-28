import { useCallback, useEffect, useState } from 'react'
import { Button, Image, Sheet, Spinner, Text, XStack, YStack } from '@my/ui'
import { Check, X } from '@tamagui/lucide-icons'

type PendingMember = {
  publicKey: string
  username: string
  pfp?: string
  nickname?: string
  joinedAt: number
}

type Props = {
  open: boolean
  onClose: () => void
  serverUrl: string
  serverName: string
}

export function JoinRequestsSheet({
  open,
  onClose,
  serverUrl,
  serverName,
}: Props) {
  const [pending, setPending] = useState<PendingMember[]>([])
  const [loading, setLoading] = useState(false)
  const [actioning, setActioning] = useState<string | null>(null)

  const fetchPending = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${serverUrl}/members/pending`)
      const data = await res.json()
      if (Array.isArray(data)) setPending(data)
    } catch {
      // network error — silently ignore, list stays stale
    } finally {
      setLoading(false)
    }
  }, [serverUrl])

  useEffect(() => {
    if (open) fetchPending()
  }, [open, fetchPending])

  const act = async (publicKey: string, action: 'approve' | 'deny') => {
    setActioning(publicKey)
    try {
      await fetch(
        `${serverUrl}/members/${encodeURIComponent(publicKey)}/${action}`,
        {
          method: 'POST',
        }
      )
      setPending((prev) => prev.filter((m) => m.publicKey !== publicKey))
    } catch {
      // network error — silently ignore
    } finally {
      setActioning(null)
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onClose}
      modal
      dismissOnSnapToBottom
      snapPoints={[60]}
    >
      <Sheet.Frame p="$4">
        <YStack gap="$4">
          <YStack gap="$1">
            <Text fontSize="$5" fontWeight="700">
              Join Requests
            </Text>
            <Text fontSize="$2" color="$color10">
              {serverName}
            </Text>
          </YStack>

          {loading ? (
            <YStack alignItems="center" py="$6">
              <Spinner size="large" />
            </YStack>
          ) : pending.length === 0 ? (
            <YStack alignItems="center" py="$6" gap="$2">
              <Text fontSize="$4" color="$color10">
                No pending requests
              </Text>
              <Text fontSize="$2" color="$color9">
                New join requests will appear here.
              </Text>
            </YStack>
          ) : (
            <YStack gap="$3">
              {pending.map((member) => (
                <XStack
                  key={member.publicKey}
                  alignItems="center"
                  gap="$3"
                  py="$2"
                  borderBottomWidth={1}
                  borderColor="$borderColor"
                >
                  {member.pfp ? (
                    <Image
                      src={member.pfp}
                      width={36}
                      height={36}
                      borderRadius="$10"
                    />
                  ) : (
                    <YStack
                      width={36}
                      height={36}
                      borderRadius="$10"
                      bg="$color5"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Text fontSize="$3" fontWeight="700">
                        {member.username[0]?.toUpperCase()}
                      </Text>
                    </YStack>
                  )}

                  <YStack flex={1} gap="$1">
                    <Text fontWeight="600" fontSize="$3">
                      {member.username}
                    </Text>
                    <Text fontSize="$1" color="$color9">
                      {new Date(member.joinedAt * 1000).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </YStack>

                  <XStack gap="$2">
                    <Button
                      size="$3"
                      theme="green"
                      icon={Check}
                      onPress={() => act(member.publicKey, 'approve')}
                      disabled={actioning === member.publicKey}
                    >
                      Approve
                    </Button>
                    <Button
                      size="$3"
                      theme="red"
                      icon={X}
                      onPress={() => act(member.publicKey, 'deny')}
                      disabled={actioning === member.publicKey}
                    >
                      Deny
                    </Button>
                  </XStack>
                </XStack>
              ))}
            </YStack>
          )}
        </YStack>
      </Sheet.Frame>
      <Sheet.Overlay />
    </Sheet>
  )
}
