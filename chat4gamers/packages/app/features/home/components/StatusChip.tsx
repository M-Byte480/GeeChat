import { Circle } from '@my/ui'

export function StatusChip({ status }: { status: string }) {
  const statusColors = {
    online: '$green10',
    offline: '$gray10',
    away: '$yellow10',
    do_not_disturb: '$red10',
    invisible: 'transparent',
  }

  return (
    <Circle
      size={12}
      bg={statusColors[status] || '$gray10'}
      borderWidth={2}
      borderColor="$background" // This creates the "cutout" look against the avatar
    />
  )
}
