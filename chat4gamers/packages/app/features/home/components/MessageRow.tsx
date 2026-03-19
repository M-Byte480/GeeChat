import { useUser } from '../hooks/useUser'
import { Avatar, XStack, YStack, Text } from '@my/ui'
import type { Identity } from '../identity'
import {Message} from "app/features/home/types/types";
import {MessageContent} from "app/features/home/components/MessageContent";
import {MentionText} from "app/features/home/text/MentionText";
import {memo} from "react";
import {useIdentity} from "app/features/home/identity/IdentityContext";

interface Props {
  message: Message
  serverUrl: string
  onLayout?: (event: any) => void
}

export const MessageRow = memo(({ message, serverUrl, onLayout  }: Props)=> {
  const { identity } = useIdentity()
  const user = useUser(serverUrl, message.senderId, identity)

  return (
    <>
      <XStack gap="$3" paddingVertical="$2" alignItems="flex-start" onLayout={onLayout}>
        <Avatar circular size="$4">
          <Avatar.Image source={{ uri: user?.avatarUrl || 'https://placehold.co/100x100' }} />
          <Avatar.Fallback bc="$color8" />
        </Avatar>
        <YStack flex={1} gap="$1">
          <XStack gap="$2" alignItems="center">
            <Text fontWeight="bold" fontSize="$3">
              {user?.nickname ?? user?.username ?? message.senderName}
            </Text>
            <Text fontSize="$1" color="$gray10">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </XStack>
          <MentionText
            content={message.content}
            serverUrl={serverUrl}
            identity={identity}
          />
        </YStack>
      </XStack>
    </>
  )
})

/**           Previous design, kept here for reference and potential future use:
 *             <XStack key={msg.id} gap="$3" alignItems="flex-start">
 *               <Image src="favicon.ico" width={40} height={40} borderRadius="$10" />
 *               <YStack flex={1} gap="$1">
 *                 <XStack gap="$2" alignItems="center">
 *                   <Text fontWeight="bold" fontSize="$3">{msg.senderName || msg.senderId}</Text>
 *                   <Text fontSize="$1" color="$gray10">
 *                     {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
 *                   </Text>
 *                 </XStack>
 *                 <MessageContent content={msg.content} onLinkPress={setPendingUrl} onImagePress={setLightboxUrl} />
 *               </YStack>
 *             </XStack>
 */