'use client'

import { useEffect, useState } from 'react'
import { XStack, Text, Button, YStack } from '@my/ui'
import { Download, RotateCcw } from '@tamagui/lucide-icons'

export function UpdateBanner() {
  const [progress, setProgress] = useState<number | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const api = (window as any).electronAPI
    if (!api) return // Not running in Electron

    const removeProgress = api.onUpdateProgress((percent: number) => {
      setProgress(percent)
    })

    const removeReady = api.onUpdateReady(() => {
      setProgress(null)
      setReady(true)
    })

    return () => {
      removeProgress?.()
      removeReady?.()
    }
  }, [])

  if (!progress && !ready) return null

  return (
    <XStack
      bg={ready ? '$blue9' : '$color3'}
      px="$4"
      py="$3"
      borderRadius="$4"
      borderWidth={1}
      borderColor={ready ? '$blue7' : '$borderColor'}
      alignItems="center"
      gap="$3"
      zIndex={1000}
      animation="quick"
    >
      {ready ? (
        <>
          <RotateCcw size={16} color="white" />
          <Text color="white" flex={1} fontSize="$3" fontWeight="600">
            Update ready to install
          </Text>
          <Button
            size="$3"
            theme="active"
            onPress={() => (window as any).electronAPI?.installUpdate()}
          >
            Restart & Update
          </Button>
        </>
      ) : (
        <>
          <Download size={16} color="$color11" />
          <Text flex={1} fontSize="$3" color="$color11">
            Downloading update...
          </Text>
          <Text fontSize="$3" color="$color10" fontWeight="600">
            {progress}%
          </Text>
        </>
      )}
    </XStack>
  )
}
