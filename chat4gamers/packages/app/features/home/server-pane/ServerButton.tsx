import {Button, Text, Tooltip} from '@my/ui'
import {ContextMenu} from 'app/features/home/components/ContextMenu'

type ServerButtonProps = {
    server: { id: string; name: string }
    isActive: boolean
    onSelect: (server: { id: string; name: string }) => void
    options: { label: string; onPress: () => void }[]
}

export function ServerButton({
                                 server,
                                 isActive,
                                 onSelect,
                                 options,
                             }: ServerButtonProps) {
    const initials = server.name
        .split(/\s+/)
        .slice(0, 2)
        .map((w: string) => w[0]?.toUpperCase() ?? '')
        .join('')

    return (
        <ContextMenu options={options}>
            <Tooltip placement="right">
                <Tooltip.Trigger>
                    <Button
                        circular
                        size="$5"
                        padding={0}
                        overflow="hidden"
                        theme={isActive ? 'active' : undefined}
                        borderWidth={isActive ? 2 : 0}
                        borderColor={isActive ? '$color8' : 'transparent'}
                        animation="bouncy"
                        hoverStyle={{borderRadius: '$4', scale: 1.05}}
                        onPress={() => onSelect(server)}
                    >
                        <Text
                            fontSize="$3"
                            fontWeight="700"
                            color={isActive ? '$color12' : '$color11'}
                        >
                            {initials}
                        </Text>
                    </Button>
                </Tooltip.Trigger>
                <Tooltip.Content
                    enterStyle={{x: -10, opacity: 0}}
                    exitStyle={{x: -10, opacity: 0}}
                    animation={[
                        'quick',
                        {
                            opacity: {
                                overshootClamping: true,
                            },
                        },
                    ]}
                >
                    <Text fontSize="$2">{server.name}</Text>
                </Tooltip.Content>
            </Tooltip>
        </ContextMenu>
    )
}
