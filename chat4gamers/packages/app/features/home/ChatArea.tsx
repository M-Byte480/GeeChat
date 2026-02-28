import { XStack, YStack, Input, Paragraph, ScrollView, Image, Text, Button, Sheet } from '@my/ui'
import { Send, X, ExternalLink } from '@tamagui/lucide-icons'
import { useState, useEffect, useRef, useCallback } from "react";
import { API_BASE, WS_BASE } from "app/constants/config";

// ── URL / media helpers ────────────────────────────────────────────────────
// Capturing group so split() keeps the matched URLs in the parts array
const URL_PATTERN = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;
const IMAGE_EXT   = /\.(jpe?g|png|gif|webp|svg|bmp|avif|ico)(\?[^\s]*)?$/i;
const VIDEO_EXT   = /\.(mp4|webm|ogg|mov)(\?[^\s]*)?$/i;

function openExternal(url: string) {
  const api = (window as any).electronAPI;
  if (api?.openExternal) {
    api.openExternal(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

function MessageContent({ content, onLinkPress }: { content: string; onLinkPress: (url: string) => void }) {
  const parts = content.split(URL_PATTERN);
  const mediaUrls = parts.filter(p => (p.startsWith('http://') || p.startsWith('https://')) && (IMAGE_EXT.test(p) || VIDEO_EXT.test(p)));

  // Native HTML elements — safe in web/Electron, cast to avoid TS errors in RN types
  const Img = 'img' as any;
  const Vid = 'video' as any;

  return (
    <YStack gap="$1">
      <Paragraph fontSize="$3">
        {parts.map((part, i) =>
          part.startsWith('http://') || part.startsWith('https://') ? (
            <Text
              key={i}
              fontSize="$3"
              color="$blue10"
              // @ts-ignore – web/Electron only styles
              style={{ textDecorationLine: 'underline', cursor: 'pointer', wordBreak: 'break-all' }}
              onPress={() => onLinkPress(part)}
            >
              {part}
            </Text>
          ) : (
            <Text key={i} fontSize="$3">{part}</Text>
          )
        )}
      </Paragraph>
      {mediaUrls.map((url, i) =>
        VIDEO_EXT.test(url) ? (
          <Vid
            key={i}
            src={`${API_BASE}/proxy-image?url=${encodeURIComponent(url)}`}
            controls
            style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, marginTop: 4 }}
          />
        ) : (
          <Img
            key={i}
            src={`${API_BASE}/proxy-image?url=${encodeURIComponent(url)}`}
            style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, marginTop: 4, objectFit: 'contain', cursor: 'pointer' }}
            onClick={() => onLinkPress(url)}
          />
        )
      )}
    </YStack>
  );
}

export type Message = {
  content: string;
  id: number;
  roomId: string;
  senderId: string;
  timestamp: string;
}

type Props = {
  nickname: string;
  channelId: string;
}

export const ChatArea = ({ nickname, channelId }: Props) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const errorTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Refs — declared before any effects that use them
  const socketRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollViewRef = useRef<any>(null);
  const isAtBottomRef = useRef(true);
  const initialLoadRef = useRef(true);

  const showError = useCallback((msg: string) => {
    setErrorBanner(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setErrorBanner(null), 5000);
  }, []);

  // Reset state when switching channels
  useEffect(() => {
    setMessages([]);
    initialLoadRef.current = true;
  }, [channelId]);

  // ── Scroll helpers ────────────────────────────────────────────────
  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    isAtBottomRef.current =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 80;
  }, []);

  // Scroll on new messages — instant on first load, smart on subsequent
  useEffect(() => {
    if (messages.length === 0) return;

    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      scrollToBottom(false);
      return;
    }

    const latest = messages[messages.length - 1];
    const isOwn = latest?.senderId === nickname;
    if (isAtBottomRef.current || isOwn) {
      scrollToBottom(true);
    }
  }, [messages, nickname, scrollToBottom]);

  // ── WebSocket + history ───────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/chat-history?channel=${channelId}`)
      .then(res => {
        if (!res.ok) throw new Error("Server error");
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) setMessages(data);
      })
      .catch(() => {
        showError("Could not load message history. Is the server running?");
        setMessages([]);
      });

    const ws = new WebSocket(`${WS_BASE}/ws`);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'NEW_MESSAGE' && msg.channelId === channelId) {
        setMessages((prev) => {
          const isDuplicate = prev.some(m =>
            m.id === msg.id || (m.id.toString().length > 10 && m.content === msg.content)
          );
          if (isDuplicate) {
            return prev.map(m =>
              (m.content === msg.content && m.id.toString().length > 10) ? msg : m
            );
          }
          return [...prev, msg];
        });
      }

      if (msg.type === 'TYPING' && msg.username !== nickname) {
        setTypingUser(msg.username);
        setTimeout(() => setTypingUser(null), 2500);
      }
    };

    ws.onerror = () => showError("Connection lost. Reconnect by switching channels.");

    return () => ws.close();
  }, [channelId, nickname, showError]);

  // ── Send ──────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const currentText = inputText;
    const tempId = Date.now();

    setMessages(prev => [...prev, {
      id: tempId,
      content: currentText,
      roomId: channelId,
      senderId: nickname,
      timestamp: new Date().toISOString(),
    }]);
    setInputText("");

    try {
      await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: channelId, content: currentText, userId: nickname }),
      });
    } catch {
      showError("Failed to send message. Check your connection.");
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };

  const handleInputChange = (text: string) => {
    setInputText(text);

    const ws = socketRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      if (!typingTimeoutRef.current) {
        ws.send(JSON.stringify({ type: 'TYPING', username: nickname, channelId }));
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        typingTimeoutRef.current = null;
      }, 2000);
    }
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <YStack flex={1} p="$4" bg="$background" height="100%">
      {errorBanner && (
        <XStack
          bg="$red9"
          px="$4"
          py="$2"
          mb="$3"
          borderRadius="$3"
          alignItems="center"
          gap="$3"
          animation="quick"
          enterStyle={{ opacity: 0, y: -8 }}
        >
          <Text color="white" flex={1} fontSize="$3">{errorBanner}</Text>
          <Button
            size="$2"
            chromeless
            icon={X}
            color="white"
            onPress={() => setErrorBanner(null)}
          />
        </XStack>
      )}
      <ScrollView
        ref={scrollViewRef}
        flex={1}
        mb="$4"
        onScroll={handleScroll}
        scrollEventThrottle={100}
      >
        <YStack gap="$2">
          {messages.map((msg) => (
            <XStack key={msg.id} gap="$3" alignItems="flex-start">
              <Image src="favicon.ico" width={40} height={40} borderRadius="$10" />
              <YStack flex={1} gap="$1">
                <XStack gap="$2" alignItems="center">
                  <Text fontWeight="bold" fontSize="$3">{msg.senderId}</Text>
                  <Text fontSize="$1" color="$gray10">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </XStack>
                <MessageContent content={msg.content} onLinkPress={setPendingUrl} />
              </YStack>
            </XStack>
          ))}
        </YStack>
        {typingUser && (
          <Paragraph size="$1" color="$gray10" mt="$2">
            {typingUser} is typing...
          </Paragraph>
        )}
      </ScrollView>

      <XStack gap="$2" alignItems="center">
        <Input
          flex={1}
          placeholder="Type a message..."
          size="$4"
          value={inputText}
          onChangeText={handleInputChange}
          onSubmitEditing={sendMessage}
        />
        <Button
          size="$4"
          icon={Send}
          onPress={sendMessage}
          disabled={!inputText.trim()}
          theme="active"
        />
      </XStack>

      {/* ── External link confirmation ── */}
      <Sheet open={!!pendingUrl} onOpenChange={(open) => { if (!open) setPendingUrl(null) }} modal dismissOnSnapToBottom snapPoints={[32]}>
        <Sheet.Frame p="$5" gap="$4">
          <XStack gap="$2" alignItems="center">
            <ExternalLink size={18} color="$color10" />
            <Text fontWeight="700" fontSize="$5">Open external link?</Text>
          </XStack>
          <Text fontSize="$3" color="$color10" numberOfLines={2}
            // @ts-ignore
            style={{ wordBreak: 'break-all' }}
          >
            {pendingUrl}
          </Text>
          <XStack gap="$3">
            <Button flex={1} size="$4" onPress={() => setPendingUrl(null)}>
              Cancel
            </Button>
            <Button
              flex={1}
              size="$4"
              theme="active"
              onPress={() => { openExternal(pendingUrl!); setPendingUrl(null) }}
            >
              Open
            </Button>
          </XStack>
        </Sheet.Frame>
        <Sheet.Overlay />
      </Sheet>
    </YStack>
  );
}
