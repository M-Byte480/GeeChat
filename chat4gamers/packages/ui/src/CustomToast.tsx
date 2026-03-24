import {NativeToast as Toast} from './NativeToast'

let isExpoGo = false
try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require('expo-constants').default
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {ExecutionEnvironment} = require('expo-constants')
    isExpoGo = Constants?.executionEnvironment === ExecutionEnvironment?.StoreClient
} catch {
    // not in expo environment
}

export const CustomToast = () => {
    if (isExpoGo) {
        return null
    }
    return <Toast/>
}
