import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

// Check if we are running from the packaged app or source
const isDev = process.env.NODE_ENV === 'development'

if (isDev) {
  // Only use ts-node in development
  register('ts-node/esm', pathToFileURL('./'))
  await import('./main.ts')
} else {
  // In production, load the compiled javascript file
  // (Assuming you compile main.ts to main.js inside an 'out' or 'dist' folder)
  await import('./main.js')
}
