export enum UserStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  AWAY = 'away',
  DO_NOT_DISTURB = 'do_not_disturb',
  INVISIBLE = 'invisible',
}

export type User = {
  username: string;
  publicKey: string;
  status: UserStatus;
  avatarUrl?: string;
}

export interface Users {
  [publicKey: string]: User
}