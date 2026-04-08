export type ChannelType = 'text' | 'voice'

export type Message = {
  id: number
  content: string
  roomId: string
  senderId: string
  senderName: string
  timestamp: string
  deletedAt?: string | null
}

export type Channel = {
  id: string
  name: string
  description?: string
  type: ChannelType
}

export const CHANNELS: Channel[] = [
  { id: 'general', name: 'general', type: 'text' },
  { id: 'off-topic', name: 'off-topic', type: 'text' },
  { id: 'hideout', name: 'hideout', type: 'voice' },
  { id: 'gaming', name: 'gaming', type: 'voice' },
]
