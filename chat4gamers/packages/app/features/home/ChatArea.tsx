import { YStack, Input, Spacer, Paragraph, ScrollView } from '@my/ui'
import { useState, useEffect, useRef } from "react";
import { SERVER_IP } from "app/constants/config";

export const ChatArea = () => {
  const [messages, setMessages] = useState<{ id: string; text: string }[]>([]);
  const [inputText, setInputText] = useState("");
  const socketRef = useRef<WebSocket | null>(null);
  const channels = useRef<Array<{ id: string; text: string }>>([]);
  const channelId = 'test';
  useEffect(() => {
    fetch(`http://${SERVER_IP}:4000/chat-history?channel=${channelId}`)
      .then(res => res.json())
      .then(data => setMessages(data));

    // Connect once on mount
    const ws = new WebSocket(`ws://${SERVER_IP}:4000/ws`);
    socketRef.current = ws;

    ws.onopen = () => {
      // Tell the server which channel we are looking at
      ws.send(JSON.stringify({ type: 'JOIN_CHANNEL', channelId }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.channelId === channelId) { // Only show if it's for this channel
        setMessages((prev) => [...prev, data]);
      }
    };

    // Cleanup on unmount
    return () => ws.close();
  }, [channelId]);

  const sendMessage = () => {
    console.log("Socket State:", socketRef.current?.readyState);
    console.log("Input Text:", inputText);
    console.log(socketRef.current?.readyState === WebSocket.OPEN)

    if (inputText.trim() && socketRef.current?.readyState === WebSocket.OPEN) {
      const msgPayload = {
        id: Date.now().toString(),
        text: inputText,
      };

      // Send to server
      socketRef.current.send(JSON.stringify(msgPayload));

      // Optimistic update (show it on your screen immediately)
      setMessages((prev) => [...prev, msgPayload]);
      setInputText("");
    }
  };

  return (
    <YStack flex={1} p="$4" bg="$background" height="100%">
      <ScrollView flex={1} mb="$4">
        <YStack gap="$2">
          {messages.map((msg) => (
            <YStack
              key={msg.id}
              p="$3"
              bg="$color3"
              borderRadius="$4"
              alignSelf="flex-start"
              maxWidth="80%"
            >
              <Paragraph>{msg.text}</Paragraph>
            </YStack>
          ))}
        </YStack>
      </ScrollView>

      <YStack gap="$2">
        <Input
          placeholder="Type a message..."
          size="$4"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={sendMessage} // Hits 'Enter' to send
        />
      </YStack>
    </YStack>
  );
}