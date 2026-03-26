import {Avatar, Button} from '@my/ui'

export function AvatarButton({
                                 onClickCallback,
                             }: {
    onClickCallback?: () => void
}) {
    return (
        <Button
            circular
            size="$5"
            padding={0} // Ensure the image fills the circle
            overflow="hidden"
            hoverStyle={{borderRadius: '$4', scale: 1.1}} // Discord-style hover effect
            animation="bouncy"
            onClick={onClickCallback}
        >
            {/* If server.image exists, we'd use an Avatar or Image here */}
            <Avatar circular size="$5">
                <Avatar.Image
                    source={{
                        uri: 'https://placehold.co/100x100', // Placeholder image
                        width: 50,
                        height: 50,
                    }}
                />
                <Avatar.Fallback bc="$color8"/>
            </Avatar>
        </Button>
    )
}
