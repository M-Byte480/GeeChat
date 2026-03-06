import { Button, ScrollView, Text, XStack, YStack } from '@my/ui'
import { Smile, X } from '@tamagui/lucide-icons'
import { memo, useState } from 'react'
import { Pressable } from 'react-native'

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: 'Smileys',
    emojis: [
      '😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊',
      '😋','😎','😍','🥰','😘','😗','😙','😚','🙂','🤗',
      '🤩','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥',
      '😮','🤐','😯','😪','😫','😴','😌','😛','😜','😝',
    ],
  },
  {
    label: 'Gestures',
    emojis: [
      '👍','👎','👌','✌️','🤞','🤙','👋','🤚','🖐️','✋',
      '🖖','👏','🙌','🤜','🤛','🤝','🙏','💪','🦾','🫶',
    ],
  },
  {
    label: 'Hearts',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔',
      '❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️',
    ],
  },
  {
    label: 'Gaming',
    emojis: [
      '🎮','🕹️','🎯','🏆','🥇','🎖️','🎲','🃏','♟️','🎰',
      '👾','🤖','💀','☠️','👊','💥','⚔️','🛡️','🔫','💣',
    ],
  },
  {
    label: 'Animals',
    emojis: [
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯',
      '🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🦄',
    ],
  },
  {
    label: 'Objects',
    emojis: [
      '🔥','⭐','🌟','✨','💫','🎉','🎊','🎈','🎁','🔔',
      '💡','🔑','🗝️','💎','💰','📱','💻','🖥️','⌨️','🖱️',
    ],
  },
]

type Props = {
  onSelect: (emoji: string, keepOpen: boolean) => void
}

export const EmojiPicker = memo(({ onSelect }: Props) => {
  const [open, setOpen] = useState(false)

  const handleSelect = (emoji: string, e: any) => {
    const isShiftPressed = e.shiftKey || e.nativeEvent?.shiftKey
    onSelect(emoji, isShiftPressed)
    if (!isShiftPressed) setOpen(false)
  }

  return (
    <YStack>
      {open && (
        <YStack
          position="absolute"
          bottom="110%"
          right={0}
          width={280}
          height={240}
          bg="$background"
          borderWidth={1}
          borderColor="$borderColor"
          borderRadius="$4"
          overflow="hidden"
          zIndex={100}
          shadowColor="$shadowColor"
          shadowRadius={8}
          shadowOffset={{ width: 0, height: -2 }}
          shadowOpacity={0.15}
        >
          <XStack
            justifyContent="space-between"
            alignItems="center"
            px="$3"
            py="$2"
            borderBottomWidth={1}
            borderBottomColor="$borderColor"
          >
            <Text fontSize="$2" color="$gray10">Emoji</Text>
            <Button size="$2" chromeless icon={X} onPress={() => setOpen(false)} />
          </XStack>

          <ScrollView flex={1}>
            <YStack padding="$2" gap="$2">
              {EMOJI_CATEGORIES.map((cat) => (
                <YStack key={cat.label} gap="$1">
                  <Text fontSize="$1" color="$gray9" paddingLeft="$1">{cat.label}</Text>
                  <XStack flexWrap="wrap">
                    {cat.emojis.map((emoji) => (
                      <Pressable
                        key={emoji}
                        onPress={(e) => handleSelect(emoji, e)}
                        style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text fontSize="$5">{emoji}</Text>
                      </Pressable>
                    ))}
                  </XStack>
                </YStack>
              ))}
            </YStack>
          </ScrollView>
        </YStack>
      )}

      <Button
        size="$4"
        icon={Smile}
        onPress={() => setOpen((v) => !v)}
        theme="active"
      />
    </YStack>
  )
})
