import { MainContentBanner } from '../components/MainContentBanner'

type Props = {
  showMemberPane: boolean
  onToggleMemberPane: () => void
}

export function DirectMessagesBanner({ showMemberPane, onToggleMemberPane }: Props) {
  return (
    <MainContentBanner showMemberPane={showMemberPane} onToggleMemberPane={onToggleMemberPane}>
      {/* TODO: Add DM banner content */}
    </MainContentBanner>
  )
}
