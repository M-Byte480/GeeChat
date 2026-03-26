import {ChevronLeft, Menu} from '@tamagui/lucide-icons'
import {Button} from '@my/ui'

export function ServerCollapseHamburger({isCollapsed, onToggle}) {
    return (
        <Button
            chromeless
            size="$4"
            onClick={onToggle}
            icon={isCollapsed ? Menu : ChevronLeft}
        />
    )
}
