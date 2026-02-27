export type ChannelType = 'text' | 'voice'

export type Channel = {
  id: string
  name: string
  type: ChannelType
}

export const CHANNELS: Channel[] = [
  { id: 'general',   name: 'general',   type: 'text'  },
  { id: 'off-topic', name: 'off-topic', type: 'text'  },
  { id: 'hideout',   name: 'hideout',   type: 'voice' },
  { id: 'gaming',    name: 'gaming',    type: 'voice' },
]
