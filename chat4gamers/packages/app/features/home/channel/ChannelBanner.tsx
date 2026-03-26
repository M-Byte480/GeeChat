import {MainContentBanner} from '../components/MainContentBanner'
import {ChannelTitle} from './ChannelTitle'
import {ChannelDescription} from './ChannelDescription'
import type {Channel} from 'app/features/home/types/types'

type Props = {
    activeChannel: Channel
    showMemberPane: boolean
    onToggleMemberPane: () => void
}

export function ChannelBanner({
                                  activeChannel,
                                  showMemberPane,
                                  onToggleMemberPane,
                              }: Props) {
    return (
        <MainContentBanner
            showMemberPane={showMemberPane}
            onToggleMemberPane={onToggleMemberPane}
        >
            <ChannelTitle>{activeChannel.name}</ChannelTitle>

            <ChannelDescription>
                {activeChannel.description ?? 'No description'}
            </ChannelDescription>
        </MainContentBanner>
    )
}
