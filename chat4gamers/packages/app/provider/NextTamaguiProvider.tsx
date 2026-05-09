'use client'

import '@tamagui/core/reset.css'
import '@tamagui/font-inter/css/400.css'
import '@tamagui/font-inter/css/700.css'
import '@tamagui/polyfill-dev'

// User-selectable fonts
import '@fontsource/inter/400.css'
import '@fontsource/inter/600.css'
import '@fontsource/outfit/400.css'
import '@fontsource/outfit/600.css'
import '@fontsource/poppins/400.css'
import '@fontsource/poppins/600.css'
import '@fontsource/quicksand/400.css'
import '@fontsource/quicksand/600.css'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useServerInsertedHTML } from 'next/navigation'
import { NextThemeProvider, useRootTheme } from '@tamagui/next-theme'
import { config } from '@my/ui'
import { Provider } from 'app/provider'
import { StyleSheet } from 'react-native'
import { useAppStore } from 'app/features/home/hooks/useAppStore'

export const FONT_OPTIONS = [
  { key: 'inter',     label: 'Inter',     stack: '"Inter", system-ui, sans-serif' },
  { key: 'outfit',    label: 'Outfit',    stack: '"Outfit", system-ui, sans-serif' },
  { key: 'poppins',   label: 'Poppins',   stack: '"Poppins", system-ui, sans-serif' },
  { key: 'quicksand', label: 'Quicksand', stack: '"Quicksand", system-ui, sans-serif' },
] as const

export type FontKey = typeof FONT_OPTIONS[number]['key']

export const NextTamaguiProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useRootTheme()
  const appFont = useAppStore((s) => s.appFont)

  useEffect(() => {
    const stack = FONT_OPTIONS.find((f) => f.key === appFont)?.stack ?? FONT_OPTIONS[0].stack
    // Inject/update a <style> tag after all other stylesheets so it wins by
    // source order at equal specificity — no !important needed.
    let el = document.getElementById('app-font-override') as HTMLStyleElement | null
    if (!el) {
      el = document.createElement('style')
      el.id = 'app-font-override'
      document.head.appendChild(el)
    }
    el.textContent = `
      .font_body, .font_heading { --f-family: ${stack}; }
      body { font-family: var(--f-family, ${stack}); }
    `
  }, [appFont])

  useServerInsertedHTML(() => {
    // @ts-expect-error – getSheet is a RNW private API not in the types
    const rnwStyle = StyleSheet.getSheet()
    return (
      <>
        <link rel="stylesheet" href="/tamagui.css" />
        <style
          dangerouslySetInnerHTML={{ __html: rnwStyle.textContent }}
          id={rnwStyle.id}
        />
        <style
          dangerouslySetInnerHTML={{
            // the first time this runs you'll get the full CSS including all themes
            // after that, it will only return CSS generated since the last call
            __html: config.getNewCSS(),
          }}
        />

        <style
          dangerouslySetInnerHTML={{
            __html: config.getCSS({
              exclude:
                process.env.NODE_ENV === 'production' ? 'design-system' : null,
            }),
          }}
        />

        <script
          dangerouslySetInnerHTML={{
            // avoid flash of animated things on enter:
            __html: `document.documentElement.classList.add('t_unmounted')`,
          }}
        />
      </>
    )
  })

  return (
    <NextThemeProvider
      skipNextHead
      defaultTheme="dark"
      onChangeTheme={(next) => {
        setTheme(next as Parameters<typeof setTheme>[0])
      }}
    >
      <Provider disableRootThemeClass defaultTheme={theme || 'dark'}>
        {children}
      </Provider>
    </NextThemeProvider>
  )
}
