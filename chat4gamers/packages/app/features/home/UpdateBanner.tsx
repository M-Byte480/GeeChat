'use client'

import { useEffect, useState } from 'react'
import { XStack, Text, Button } from '@my/ui'
import { Download, RotateCcw } from '@tamagui/lucide-icons'

export function UpdateBanner() {
  const [progress, setProgress] = useState<number | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    let ipcRenderer: any
    try {
      ipcRenderer = (window as any).require('electron').ipcRenderer
    } catch {
      return // Not running in Electron
    }

    ipcRenderer.on('update-progress', (_: any, percent: number) => {
      setProgress(percent)
    })

    ipcRenderer.on('update-ready', () => {
      setProgress(null)
      setReady(true)
    })

    return () => {
      ipcRenderer.removeAllListeners('update-progress')
      ipcRenderer.removeAllListeners('update-ready')
    }
  }, [])

  if (!progress && !ready) return null

  return (
    <XStack
      position="absolute"
      bottom="$4"
      left="$4"
      right="$4"
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
      enterStyle={{ opacity: 0, y: 8 }}
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
            onPress={() => (window as any).require('electron').ipcRenderer.send('install-update')}
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
