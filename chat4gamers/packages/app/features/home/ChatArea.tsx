import { YStack, Input, Spacer, Paragraph, ScrollView } from '@my/ui'
import { useState, useEffect, useRef } from "react";
import { SERVER_IP } from "app/constants/config";

export type Message = {
  content: string;
  id  : number;
  roomId : string;
  senderId : string;
  timestamp : string;
}

export const ChatArea = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const socketRef = useRef<WebSocket | null>(null);
  const channels = useRef<Array<{ id: string; text: string }>>([]);
  const channelId = 'test';
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch(`https://${SERVER_IP}/chat-history?channel=${channelId}`)
      .then(res => {
        if (!res.ok) throw new Error("Server error");
        return res.json();
      })
      .then(data => {
        // Ensure data is actually an array before setting
        if (Array.isArray(data)) {
          setMessages(data);
        }
      })
      .catch(err => {
        console.error("Fetch failed:", err);
        setMessages([]); // Fallback to empty array to prevent .map() crash
      });

    const ws = new WebSocket(`wss://${SERVER_IP}/ws`);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'NEW_MESSAGE' && msg.channelId === channelId) {
        setMessages((prev) => {
          // Logic: If we already have a message with this content sent very recently,
          // or if the ID matches exactly, don't add it again.
          const isDuplicate = prev.some(m =>
            m.id === msg.id || (m.id.toString().length > 10 && m.content === msg.content)
          );

          if (isDuplicate) {
            // Optional: Replace the temp "string" ID message with the real "number" ID message
            return prev.map(m => (m.content === msg.content && m.id.toString().length > 10) ? msg : m);
          }

          return [...prev, msg];
        });
      }
    };

    return () => ws.close();
  }, [channelId]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const currentText = inputText;
    const tempId = Date.now(); // Use a number to stay consistent with type

    // Optimistic Update using correct keys
    const optimisticMsg: Message = {
      id: tempId,
      content: currentText,
      roomId: channelId,
      senderId: 'REDACTED_USERNAME_dev',
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText("");

    try {
      await fetch(`https://${SERVER_IP}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: channelId,
          content: currentText,
          userId: 'REDACTED_USERNAME_dev'
        })
      });
    } catch (err) {
      console.error("Failed to send:", err);
      // Rollback: Remove the optimistic message if it failed
      setMessages((prev) => prev.filter(m => m.id !== tempId));
    }
  };

  const handleInputChange = (text: string) => {
    setInputText(text);

    if (socketRef.current?.readyState === WebSocket.OPEN) {

      if (!typingTimeoutRef.current) {
        socketRef.current.send(JSON.stringify({
          type: 'TYPING',
          username: 'Milan', // Replace with your actual user state
          channelId: channelId
        }));
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        typingTimeoutRef.current = null;
      }, 2000); // 2 seconds delay
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
              <Paragraph>{msg.content}</Paragraph>
            </YStack>
          ))}
        </YStack>
        {typingUser && (
          <Paragraph size="$1" color="$gray10">
            {typingUser} is typing...
          </Paragraph>
        )}
      </ScrollView>

      <YStack gap="$2">
        <Input
          placeholder="Type a message..."
          size="$4"
          value={inputText}
          onChangeText={handleInputChange}
          onSubmitEditing={sendMessage} // Hits 'Enter' to send
        />
      </YStack>
    </YStack>
  );
}