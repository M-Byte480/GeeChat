'use client'

/**
 * AppDialog — reusable centered modal dialog for web/Electron.
 *
 * Usage:
 *   <AppDialog open={show} onClose={() => setShow(false)} title="My Dialog">
 *     <Input ... />
 *     <XStack gap="$3" jc="flex-end">
 *       <AppDialog.Cancel onPress={() => setShow(false)} />
 *       <Button theme="active" onPress={handleSubmit}>Confirm</Button>
 *     </XStack>
 *   </AppDialog>
 *
 * Why not Sheet?
 *   Sheet slides up from the bottom. Dialog is a centered overlay — better
 *   for confirmations, forms, and prompts that aren't tied to a swipe gesture.
 *
 * Why the explicit `style` props?
 *   Tamagui Dialog.Overlay and Dialog.Content don't automatically apply
 *   `position: fixed` in Next.js/Electron. Without it they render in-flow
 *   and push surrounding layout. The `style` props force correct behaviour.
 */

import { Dialog, Button, XStack, YStack, Text } from '@my/ui'
import { X } from '@tamagui/lucide-icons'
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
  return (
    <Dialog modal open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <Dialog.Portal>
        {/* Full-screen dimmed backdrop */}
        <Dialog.Overlay
          key="overlay"
          animation="quick"
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
          // @ts-ignore – explicit fixed positioning required for Next.js/Electron
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
            zIndex: 10000,
          }}
        />

        {/* Centered content box */}
        <Dialog.Content
          bordered
          elevate
          key="content"
          animation="quick"
          enterStyle={{ opacity: 0, scale: 0.95, y: -8 }}
          exitStyle={{ opacity: 0, scale: 0.95, y: 8 }}
          gap="$4"
          p="$6"
          // @ts-ignore – explicit fixed positioning required for Next.js/Electron
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width,
            maxWidth: '90vw',
            zIndex: 10001,
          }}
        >
          {/* Header row */}
          <XStack alignItems="center" justifyContent="space-between">
            <Dialog.Title fontWeight="700" fontSize="$6">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <Button size="$2" circular chromeless icon={X} onPress={onClose} />
            </Dialog.Close>
          </XStack>

          {description && (
            <Dialog.Description color="$color10" fontSize="$3" mt="$-2">
              {description}
            </Dialog.Description>
          )}

          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}

/** Convenience cancel button pre-wired to Dialog.Close */
AppDialog.Cancel = function Cancel({ onPress, label = 'Cancel' }: { onPress: () => void; label?: string }) {
  return (
    <Dialog.Close asChild>
      <Button size="$4" chromeless onPress={onPress}>{label}</Button>
    </Dialog.Close>
  )
}
