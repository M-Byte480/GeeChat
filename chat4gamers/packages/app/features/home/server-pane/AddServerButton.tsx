import { Plus } from '@tamagui/lucide-icons'
import { Button } from '@my/ui'

type Props = {
  onPress?: () => void
}

export function AddServerButton({ onPress }: Props) {
  return (
    <Button
      circular
      size="$5"
      icon={<Plus size="$1" />}
      bg="$color7"
      hoverStyle={{ scale: 1.1, bg: '$color8' }}
      pressStyle={{ scale: 0.9 }}
      elevation="$2"
      aria-label="Add new server"
      onPress={onPress}
    />
  )
}
