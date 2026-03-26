import {Paragraph, Text, YStack} from '@my/ui'
import {API_BASE} from 'app/constants/config'

const URL_PATTERN = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|svg|bmp|avif|ico)(\?[^\s]*)?$/i
const VIDEO_EXT = /\.(mp4|webm|ogg|mov)(\?[^\s]*)?$/i

type Props = {
    content: string
    onLinkPress: (url: string) => void
    onImagePress: (url: string) => void
}

export function MessageContent({content, onLinkPress, onImagePress}: Props) {
    const parts = content.split(URL_PATTERN)
    const mediaUrls = parts.filter(
        (p) =>
            (p.startsWith('http://') || p.startsWith('https://')) &&
            (IMAGE_EXT.test(p) || VIDEO_EXT.test(p))
    )

    // Native HTML elements — safe in web/Electron, cast to avoid TS errors in RN types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Img = 'img' as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Vid = 'video' as any

    return (
        <YStack gap="$1">
            <Paragraph fontSize="$3">
                {parts.map((part, i) =>
                    part.startsWith('http://') || part.startsWith('https://') ? (
                        <Text
                            key={i}
                            fontSize="$3"
                            color="$blue10"
                            // @ts-expect-error – web/Electron only styles
                            style={{
                                textDecorationLine: 'underline',
                                cursor: 'pointer',
                                wordBreak: 'break-all',
                            }}
                            onPress={() => onLinkPress(part)}
                        >
                            {part}
                        </Text>
                    ) : (
                        <Text key={i} fontSize="$3">
                            {part}
                        </Text>
                    )
                )}
            </Paragraph>
            {mediaUrls.map((url, i) =>
                VIDEO_EXT.test(url) ? (
                    <Vid
                        key={i}
                        src={`${API_BASE}/proxy-image?url=${encodeURIComponent(url)}`}
                        controls
                        style={{
                            maxWidth: '100%',
                            maxHeight: 300,
                            borderRadius: 8,
                            marginTop: 4,
                        }}
                    />
                ) : (
                    <Img
                        key={i}
                        src={`${API_BASE}/proxy-image?url=${encodeURIComponent(url)}`}
                        style={{
                            maxWidth: '100%',
                            maxHeight: 300,
                            borderRadius: 8,
                            marginTop: 4,
                            objectFit: 'contain',
                            cursor: 'zoom-in',
                        }}
                        onClick={() => onImagePress(url)}
                    />
                )
            )}
        </YStack>
    )
}
