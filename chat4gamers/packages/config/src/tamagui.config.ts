import { defaultConfig } from '@tamagui/config/v5'
import { createTamagui } from 'tamagui'
import { bodyFont, headingFont } from './fonts'
import { animations } from './animations'
import { shorthands } from '@tamagui/shorthands'

export const config = createTamagui({
  ...defaultConfig,
  animations,
  shorthands,
  fonts: {
    body: bodyFont,
    heading: headingFont,
  },
  themes: {
    ...defaultConfig.themes,
    active: defaultConfig.themes.light_accent,
    light_active: defaultConfig.themes.light_accent,
    dark_active: defaultConfig.themes.dark_accent,
  },
  settings: {
    ...defaultConfig.settings,
    onlyAllowShorthands: false,
  },
})

export type Conf = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {
    animations: typeof animations
  }
}
