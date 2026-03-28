import { config } from '@my/config'

export type Conf = typeof config

declare module '@my/ui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends Conf {}
}
