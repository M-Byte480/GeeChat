import { create } from 'zustand'
import { Channel } from 'app/features/home/types/types'
import { Server } from 'app/features/home/identity/types'

interface ServerCache {
  [url: string]: {
    channels: Channel[]
    voiceParticipants: Record<string, string[]>
  }
}

interface AppState {
  activeServerUrl: string | null
  cache: ServerCache
  setActiveServerUrl: (url: string | null) => void
  setActiveServer: (server: Server) => void
  setChannels: (url: string, channels: Channel[]) => void
  setVoiceParticipants: (url: string, channelId: string, participants: string[]) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeServerUrl: null,
  cache: {},

  setActiveServerUrl: (url) => set({ activeServerUrl: url }),

  setActiveServer: (server) => set({ activeServerUrl: server.url }),

  setChannels: (url, channels) =>
    set((state) => ({
      cache: {
        ...state.cache,
        [url]: { ...state.cache[url], channels },
      },
    })),

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
}))
