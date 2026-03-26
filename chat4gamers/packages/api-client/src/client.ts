import {authenticate, getConfig, refreshSession} from './challenge'

const refreshingServers = new Map<string, Promise<string>>()

type SessionExpiredCallback = () => void
let _onSessionExpired: SessionExpiredCallback = () => {
}

export function onSessionExpired(cb: SessionExpiredCallback) {
    _onSessionExpired = cb
}

export async function apiFetch(
    baseUrl: string,
    path: string,
    init: RequestInit = {}
): Promise<Response> {
    console.warn('[apiFetch] called', baseUrl, path)
    const {getSessionToken, onSessionExpired} = getConfig()

    let token: string | null = getSessionToken(baseUrl)

    console.warn('[apiFetch] token:', token ? token.slice(0, 10) : 'NULL')
    if (!token) {
        token = await authenticate(baseUrl)
    }
    if (!token) {
        throw new Error(`No session token for ${baseUrl} — authenticate first`)
    }

    const doRequest = (t: string) =>
        fetch(`${baseUrl}${path}`, {
            ...init,
            headers: {
                'Content-Type': 'application/json',
                ...init.headers,
                Authorization: `Bearer ${t}`,
            },
        })

    const response = await doRequest(token)

    if (response.status !== 401) {
        return response
    }

    // 401 — check if a refresh is already in flight for this server
    const existing = refreshingServers.get(baseUrl)
    if (existing) {
        const newToken = await existing
        return doRequest(newToken)
    }

    // Kick off a single refresh and share the promise
    const refreshPromise = refreshSession(baseUrl).finally(() => {
        refreshingServers.delete(baseUrl)
    })

    refreshingServers.set(baseUrl, refreshPromise)

    try {
        const newToken = await refreshPromise
        return doRequest(newToken)
    } catch (err) {
        onSessionExpired(baseUrl)
        throw err
    }
}
