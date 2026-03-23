import { MainContentBanner } from '../components/MainContentBanner'
import { ChannelTitle } from './ChannelTitle'
import { ChannelDescription } from './ChannelDescription'

type Props = {
  activeChannel: any
  showMemberPane: boolean
  onToggleMemberPane: () => void
}

export function ChannelBanner({ activeChannel, showMemberPane, onToggleMemberPane }: Props) {
  return (
    <MainContentBanner showMemberPane={showMemberPane} onToggleMemberPane={onToggleMemberPane}>
      <ChannelTitle>
        {activeChannel.name}
      </ChannelTitle>

      <ChannelDescription>
        {activeChannel.description ?? 'No description'}
      </ChannelDescription>
    </MainContentBanner>
  )
}
