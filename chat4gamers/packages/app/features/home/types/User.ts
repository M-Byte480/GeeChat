export enum UserStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  AWAY = 'away',
  DO_NOT_DISTURB = 'do_not_disturb',
  INVISIBLE = 'invisible',
}

export type CustomRole = { id: string; name: string }

export type User = {
  username: string
  publicKey: string
  status: UserStatus
  avatarUrl?: string
  role?: 'owner' | 'admin' | 'member'
  joinedAt?: string
  customRoles?: CustomRole[]
}

export interface Users {
  [publicKey: string]: User
}
