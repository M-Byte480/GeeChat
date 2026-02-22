import { YStack, Input, Spacer, Paragraph } from '@my/ui'
import {useState} from "react";
import {SERVER_IP} from "app/constants/config";

export const ChatArea = () => {

  const [loadedMessages, setLoadedMessages] = useState<{ id: number; text: string; timestamp: Date }[]>([]);

  const socket = new WebSocket(`ws://${SERVER_IP}:4000/ws`);


  socket.onmessage = (event) => {
    const newMessage = JSON.parse(event.data);
    setLoadedMessages((prev) => [...prev, newMessage]);
  };

  return () => (

    <YStack flex={1} p="$4" bg="$background">
      {/* Ghost Text / Messages area */}
      <YStack flex={1} gap="$2">
        {[1, 2, 3].map((i) => (
          <YStack key={i} p="$3" bg="$color3" borderRadius="$4" width="70%" opacity={0.6}>
            <Paragraph>Ghost message #{i}...</Paragraph>
          </YStack>
        ))}
      </YStack>

      <Spacer/>

      {/* Bottom Input */}
      <Input placeholder="Type a message..." size="$4"/>
    </YStack>
  );
}