'use client'

import { useEffect, useState } from 'react'
import { Button, Input, Paragraph, Text, YStack } from '@my/ui'

const storage = () =>
  typeof window !== 'undefined' ? window.localStorage : null

type Props = {
  children: (
    nickname: string,
    changeNickname: (name: string) => void
  ) => React.ReactNode
}

export function NicknameGate({ children }: Props) {
  const [nickname, setNickname] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = storage()?.getItem('nickname') ?? null
    setNickname(saved)
    setMounted(true)
  }, [])

  const handleSubmit = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    storage()?.setItem('nickname', trimmed)
    setNickname(trimmed)
  }

  const changeNickname = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    storage()?.setItem('nickname', trimmed)
    setNickname(trimmed)
  }

  if (!mounted) return null

  if (!nickname) {
    return (
      <YStack
        flex={1}
        height="100vh"
        bg="$background"
        alignItems="center"
        justifyContent="center"
        gap="$5"
      >
        <YStack alignItems="center" gap="$2">
          <Text
            fontSize="$9"
            fontWeight="800"
            letterSpacing={-1}
            color="$color"
          >
            GeeChat
          </Text>
          <Paragraph color="$color11" fontSize="$4">
            What should we call you?
          </Paragraph>
        </YStack>

        <YStack width={320} gap="$3">
          <Input
            placeholder="Enter a nickname..."
            size="$5"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSubmit}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Button
            size="$5"
            theme="active"
            onPress={handleSubmit}
            disabled={!input.trim()}
          >
            Let me in
          </Button>
        </YStack>
      </YStack>
    )
  }

  return <>{children(nickname, changeNickname)}</>
}
