import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Convert Windows backslashes to forward slashes — Docker requires forward slashes in volume mounts
const configPath = path.resolve(__dirname, '../livekit-dev.yaml').split('\\').join('/')

const result = spawnSync(
  'docker',
  [
    'run', '--rm',
    '-p', '7880:7880',
    '-p', '7881:7881',
    '-v', `${configPath}:/livekit.yaml`,
    'livekit/livekit-server',
    '--config', '/livekit.yaml',
  ],
  { stdio: 'inherit' }
)

process.exit(result.status ?? 0)
