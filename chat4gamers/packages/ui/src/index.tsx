export * from 'tamagui'
export * from '@tamagui/toast'
export * from './MyComponent'
export {config, type Conf} from '@my/config'
export * from './CustomToast'
export * from './SwitchThemeButton'
export * from './SwitchRouterButton'

// type augmentation for tamagui custom config
import type {Conf} from '@my/config'

declare module 'tamagui' {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface TamaguiCustomConfig extends Conf {
    }
}
