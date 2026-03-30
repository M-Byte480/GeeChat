import { Platform } from 'react-native'
import { registerRootComponent } from 'expo'
import { ExpoRoot } from 'expo-router'
import React from 'react'

// Polyfill crypto.subtle for Hermes — browser already has it natively, skip there
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { install } = require('react-native-quick-crypto')
  install()
}

// workaround for EXPO_OS not being inlined by babel-preset-expo
// see: https://github.com/expo/expo/issues/33440
if (typeof process !== 'undefined' && process.env && !process.env.EXPO_OS) {
  process.env.EXPO_OS = Platform.OS
}

// Must be exported or Fast Refresh won't update the context
export function App() {
  const ctx = require.context('./app')
  return <ExpoRoot context={ctx} />
}

registerRootComponent(App)
