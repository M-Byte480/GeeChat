import { create } from 'zustand'
import { Channel, Message } from 'app/features/home/types/types'
import { Server } from 'app/features/home/identity/types'
import { User } from 'app/features/home/types/User'

interface ServerCache {
  [url: string]: {
    channels: Channel[]
    voiceParticipants: Record<string, string[]>
    gifEnabled?: boolean
  }
}

interface MessageCache {
  [channelId: string]: {
    messages: Message[]
    lastFetched: number
  }
}

interface AppState {
  activeServerUrl: string | null
  cache: ServerCache
  messageCache: MessageCache
  members: Record<string, User[]>
  micDeviceId: string | null
  setMicDeviceId: (id: string | null) => void
  setChannelMessages: (channelId: string, messages: Message[]) => void
  setActiveServerUrl: (url: string | null) => void
  setActiveServer: (server: Server) => void
  setChannels: (url: string, channels: Channel[]) => void
  setVoiceParticipants: (
    url: string,
    channelId: string,
    participants: string[]
  ) => void
  appendMessage: (channelId: string, message: Message) => void
  updateMessage: (channelId: string, tempId: number, confirmed: Message) => void
  patchMessage: (channelId: string, id: number, patch: Partial<Message>) => void
  updateMessageReaction: (channelId: string, messageId: number, emoji: string, userPublicKey: string, action: 'add' | 'remove') => void
  setGifEnabled: (url: string, enabled: boolean) => void
  setMembers: (serverUrl: string, members: User[]) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeServerUrl: null,
  cache: {},
  messageCache: {} as MessageCache,
  members: {} as Record<string, User[]>,
  micDeviceId: null,
  setMicDeviceId: (id) => set({ micDeviceId: id }),

  setChannelMessages: (channelId, messages) => {
    set((state) => ({
      messageCache: {
        ...state.messageCache,
        [channelId]: { messages, lastFetched: Date.now() },
      },
    }))
  },

  setActiveServerUrl: (url) => set({ activeServerUrl: url }),

  setActiveServer: (server) => set({ activeServerUrl: server.url }),

  setChannels: (url, channels) =>
    set((state) => ({
      cache: {
        ...state.cache,
        [url]: { ...state.cache[url], channels },
      },
    })),
  initChannel: (channelId: string) =>
    set((state) => {
      if (state.messageCache[channelId]) return state // already exists, no-op
      return {
        messageCache: {
          ...state.messageCache,
          [channelId]: { messages: [], lastFetched: 0 },
        },
      }
    }),

  setVoiceParticipants: (url, channelId, participants) =>
    set((s) => ({
      cache: {
        ...s.cache,
        [url]: {
          ...s.cache[url],
          voiceParticipants: {
            ...s.cache[url]?.voiceParticipants,
            [channelId]: participants,
          },
        },
      },
    })),
  appendMessage: (channelId: string, message: Message) =>
    set((state) => {
      const existing = state.messageCache[channelId]?.messages ?? []
      return {
        messageCache: {
          ...state.messageCache,
          [channelId]: {
            messages: [...existing, message],
            lastFetched:
              state.messageCache[channelId]?.lastFetched ?? Date.now(),
          },
        },
      }
    }),

  updateMessage: (channelId: string, tempId: number, confirmed: Message) =>
    set((state) => {
      const existing = state.messageCache[channelId]?.messages ?? []
      return {
        messageCache: {
          ...state.messageCache,
          [channelId]: {
            ...state.messageCache[channelId],
            messages: existing.map((m) => (m.id === tempId ? confirmed : m)),
          },
        },
      }
    }),

  patchMessage: (channelId: string, id: number, patch: Partial<Message>) =>
    set((state) => {
      const existing = state.messageCache[channelId]?.messages ?? []
      return {
        messageCache: {
          ...state.messageCache,
          [channelId]: {
            ...state.messageCache[channelId],
            messages: existing.map((m) => (m.id === id ? { ...m, ...patch } : m)),
          },
        },
      }
    }),

  updateMessageReaction: (channelId, messageId, emoji, userPublicKey, action) =>
    set((state) => {
      const existing = state.messageCache[channelId]?.messages ?? []
      return {
        messageCache: {
          ...state.messageCache,
          [channelId]: {
            ...state.messageCache[channelId],
            messages: existing.map((m) => {
              if (m.id !== messageId) return m
              const current = m.reactions ?? []
              if (action === 'add') {
                const idx = current.findIndex((r) => r.emoji === emoji)
                if (idx === -1) {
                  return { ...m, reactions: [...current, { emoji, count: 1, users: [userPublicKey] }] }
                }
                const updated = current.map((r, i) =>
                  i === idx ? { ...r, count: r.count + 1, users: [...r.users, userPublicKey] } : r
                )
                return { ...m, reactions: updated }
              } else {
                const updated = current
                  .map((r) =>
                    r.emoji === emoji
                      ? { ...r, count: r.count - 1, users: r.users.filter((u) => u !== userPublicKey) }
                      : r
                  )
                  .filter((r) => r.count > 0)
                return { ...m, reactions: updated }
              }
            }),
          },
        },
      }
    }),

  setGifEnabled: (url: string, enabled: boolean) =>
    set((state) => ({
      cache: {
        ...state.cache,
        [url]: { ...state.cache[url], gifEnabled: enabled },
      },
    })),

  setMembers: (serverUrl: string, members: User[]) =>
    set((state) => ({
      members: { ...state.members, [serverUrl]: members },
    })),
}))

// Expose store in devtools console: window.__store.getState()
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.__store = useAppStore
}
