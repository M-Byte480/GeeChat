export type ChannelType = 'text' | 'voice'

export type Reaction = {
  emoji: string
  count: number
  users: string[] // publicKeys
}

export type Message = {
  id: number
  content: string
  roomId: string
  senderId: string
  senderName: string
  timestamp: string
  deletedAt?: string | null
  reactions?: Reaction[]
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
