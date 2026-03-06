'use client'

/**
 * AppDialog — reusable centered modal dialog for web/Electron.
 *
 * Uses ReactDOM.createPortal directly to document.body, bypassing Tamagui's
 * Dialog.Portal which requires PortalProvider and doesn't teleport reliably
 * in Next.js/Electron without it.
 */

import { Button, XStack, YStack, Text } from '@my/ui'
import { X } from '@tamagui/lucide-icons'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  width?: number
  children: ReactNode
}

export function AppDialog({ open, onClose, title, description, width = 420, children }: Props) {
  // Avoid SSR mismatch — only portal after mount
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!open || !mounted) return null

  return createPortal(
    // Backdrop — fills viewport, click-away closes
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.55)',
        }}
        onClick={onClose}
      />

      {/* Content panel — sits above backdrop */}
      <YStack
        bg="$background"
        borderRadius="$4"
        borderWidth={1}
        borderColor="$borderColor"
        p="$6"
        gap="$4"
        // @ts-ignore
        style={{ position: 'relative', zIndex: 1, width, maxWidth: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
      >
        <XStack alignItems="center" justifyContent="space-between">
          <Text fontWeight="700" fontSize="$6">{title}</Text>
          <Button size="$2" circular chromeless icon={X} onPress={onClose} />
        </XStack>

        {description && (
          <Text color="$color10" fontSize="$3" mt="$-2">{description}</Text>
        )}

        {children}
      </YStack>
    </div>,
    document.body,
  )
}

/** Convenience cancel button */
AppDialog.Cancel = function Cancel({ onPress, label = 'Cancel' }: { onPress: () => void; label?: string }) {
  return (
    <Button size="$4" chromeless onPress={onPress}>{label}</Button>
  )
}
