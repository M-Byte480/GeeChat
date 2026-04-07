import { MainContentBanner } from '../components/MainContentBanner'
import { ChannelTitle } from './ChannelTitle'
import { ChannelDescription } from './ChannelDescription'
import { ServerLatencyBar } from 'app/features/home/components/ServerLatencyBar'
import type { Channel } from 'app/features/home/types/types'

type Props = {
  activeChannel: Channel
  serverUrl: string
  showMemberPane: boolean
  onToggleMemberPane: () => void
}

export function ChannelBanner({
  activeChannel,
  serverUrl,
  showMemberPane,
  onToggleMemberPane,
}: Props) {
  return (
    <MainContentBanner
      showMemberPane={showMemberPane}
      onToggleMemberPane={onToggleMemberPane}
      rightExtra={<ServerLatencyBar serverUrl={serverUrl} />}
    >
      <ChannelTitle>{activeChannel.name}</ChannelTitle>

      <ChannelDescription>
        {activeChannel.description ?? 'No description'}
      </ChannelDescription>
    </MainContentBanner>
  )
}
