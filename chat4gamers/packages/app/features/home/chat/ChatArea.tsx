import {Button, Text, XStack, YStack} from '@my/ui'
import {X} from '@tamagui/lucide-icons'
import {Profiler, useEffect, useRef, useState} from 'react'
import {useMessages} from '../hooks/useMessages'
import {ImageLightbox} from '../components/ImageLightbox'
import {ExternalLinkDialog} from '../components/ExternalLinkDialog'
import {useIdentity} from 'app/features/home/identity/IdentityContext'
import {useWhyDidYouRender} from 'app/features/home/hooks/useWhyDidYouRender'
import {onRender} from 'app/features/home/screen'
import {ChatInput} from 'app/features/home/chat/ChatInput'
import {MessageList} from 'app/features/home/chat/MessageList'
import type {User} from 'app/features/home/types/User'

type Props = {
    channelId: string
    serverUrl: string
    members: User[]
}

export const ChatArea = ({channelId, serverUrl, members}: Props) => {
    const {identity} = useIdentity()
    const socketRef = useRef<WebSocket | null>(null)

    const {messages, typingUser, errorBanner, setErrorBanner, sendMessage} = useMessages({
        channelId,
        identity,
        serverUrl,
        socketRef,
    })

    const [pendingUrl, setPendingUrl] = useState<string | null>(null)
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

    const initialLoadRef = useRef(true)

    // Reset scroll state when switching channels
    useEffect(() => {
        initialLoadRef.current = true
    }, [channelId])

    useWhyDidYouRender('ChatArea', {
        channelId,
        serverUrl,
        identity,
    })
    return (
        <YStack flex={1} pl={'$2'} pb="$4" bg="$background" height="100%" userSelect="auto">
            {errorBanner && false && (
                <XStack
                    bg="$red9"
                    px="$4"
                    py="$2"
                    mb="$3"
                    borderRadius="$3"
                    alignItems="center"
                    gap="$3"
                    animation="quick"
                    enterStyle={{opacity: 0, y: -8}}
                >
                    <Text color="white" flex={1} fontSize="$3">
                        {errorBanner}
                    </Text>
                    <Button
                        size="$2"
                        chromeless
                        icon={X}
                        color="white"
                        onPress={() => setErrorBanner(null)}
                    />
                </XStack>
            )}

            <Profiler id={'ScrollView'} onRender={onRender}>
                <MessageList messages={messages} serverUrl={serverUrl} typingUser={typingUser}/>
            </Profiler>


            <Profiler id={'Type a message...'} onRender={onRender}>
                <ChatInput
                    key={channelId}
                    channelId={channelId}
                    onSend={sendMessage}
                    socketRef={socketRef}
                    members={members}
                />
            </Profiler>

            <Profiler id={'Some Boxes'} onRender={onRender}>
                {lightboxUrl && <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)}/>}
                {pendingUrl && <ExternalLinkDialog url={pendingUrl} onClose={() => setPendingUrl(null)}/>}
            </Profiler>
        </YStack>
    )
}
