import { create } from 'zustand'
import { Channel, Message } from 'app/features/home/types/types'
import { Server } from 'app/features/home/identity/types'
import { User } from 'app/features/home/types/User'

interface ServerCache {
  [url: string]: {
    channels: Channel[]
    voiceParticipants: Record<string, string[]>
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
  setMembers: (serverUrl: string, members: User[]) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeServerUrl: null,
  cache: {},
  messageCache: {} as MessageCache,
  members: {} as Record<string, User[]>,

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
