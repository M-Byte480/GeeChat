'use client'

import { XStack, YStack, Sheet, Button } from '@my/ui'
import { Menu } from '@tamagui/lucide-icons'
import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { ChatArea } from './ChatArea'

export function HomeScreen() {
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  return (
    <XStack flex={1} height="100vh" bg="$background">
      {/* THIN EXPANDABLE PANE: Example of a second pane */}
      <YStack width={60} bg="$color2" borderRightWidth={1} borderColor="$borderColor">
        <Button icon={Menu} chromeless size="$4" />
      </YStack>

      {/* DESKTOP SIDEBAR: Hidden on mobile ($sm), visible on desktop */}
      <YStack $max-lg={{ display: 'none' }}>
        <Sidebar width={250} />
      </YStack>

      {/* 3. MAIN CONTENT */}
      <YStack flex={1}>
        {/* MOBILE HEADER: Only shows on small screens */}
        <XStack p="$4" $sm={{ display: 'none' }} borderBottomWidth={1} borderColor="$borderColor" width={"100%"} justify="center">
          <Button icon={Menu} onPress={() => setShowMobileMenu(true)} />
        </XStack>

        <ChatArea />
      </YStack>

      {/* 4. MOBILE DRAWER: Reuses Sidebar content for mobile */}
        <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu} modal dismissOnSnapToBottom>
          <Sheet.Frame p="$4">
            <Sidebar width="100%" />
          </Sheet.Frame>
          <Sheet.Overlay />
        </Sheet>


    </XStack>
  )
}