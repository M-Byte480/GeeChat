import { YStack, Input, Spacer, Paragraph, ScrollView } from '@my/ui'
import { useState, useEffect, useRef } from "react";
import { SERVER_IP } from "app/constants/config";

export const ChatArea = () => {
  const [messages, setMessages] = useState<{ id: string; text: string }[]>([]);
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

      // Handle Typing
      if (msg.type === 'TYPING' && msg.channelId === channelId) {
        setTypingUser(msg.username);
        setTimeout(() => setTypingUser(null), 3000);
      }

      // Handle New Messages (Broadcasted from the POST route)
      if (msg.type === 'NEW_MESSAGE' && msg.channelId === channelId) {
        setMessages((prev) => {
          // Prevention: If we already have this message (from optimistic update), skip
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, { id: msg.id, text: msg.content }];
        });
      }
    };

    return () => ws.close();
  }, [channelId]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    // 1. Optimistic Update (Show it immediately)
    const tempId = Date.now().toString();
    setMessages((prev) => [...prev, { id: tempId, text: inputText }]);
    const currentText = inputText;
    setInputText("");

    // 2. Send via REST (The "Command")
    try {
      await fetch(`https://${SERVER_IP}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: channelId,
          content: currentText,
          userId: 'REDACTED_USERNAME_dev' // Replace with real ID later
        })
      });
    } catch (err) {
      console.error("Failed to send:", err);
      // Optional: Remove the message or show error if fetch fails
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
              <Paragraph>{msg.text}</Paragraph>
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