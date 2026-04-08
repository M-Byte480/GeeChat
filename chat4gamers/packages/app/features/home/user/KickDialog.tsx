'use client'

import { createPortal } from 'react-dom'
import { useState } from 'react'
import { apiFetch } from '@my/api-client'

type Props = {
  open: boolean
  onClose: () => void
  serverUrl: string
  targetPublicKey: string
  targetName: string
}

export function KickDialog({ open, onClose, serverUrl, targetPublicKey, targetName }: Props) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open || typeof document === 'undefined') return null

  const handleConfirm = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch(serverUrl, '/admin/kick', {
        method: 'POST',
        body: JSON.stringify({ targetPublicKey, reason: reason.trim() || undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to kick member')
      }
      setReason('')
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to kick member')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setReason('')
    setError(null)
    onClose()
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={handleClose} />
      <div style={{
        position: 'relative', zIndex: 1, width: 400, maxWidth: '90vw',
        background: 'var(--background)', border: '1px solid var(--borderColor)',
        borderRadius: 12, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--color)', marginBottom: 4 }}>
            Kick {targetName}
          </div>
          <div style={{ fontSize: 13, color: 'var(--color9)' }}>
            This will remove them from the server. They can rejoin if the server is open.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color9)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Reason (optional)
          </label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter a reason…"
            maxLength={200}
            style={{
              background: 'var(--color3)', border: '1px solid var(--borderColor)',
              borderRadius: 6, padding: '8px 12px', fontSize: 14,
              color: 'var(--color)', outline: 'none', width: '100%',
            }}
          />
        </div>

        {error && <div style={{ fontSize: 12, color: 'var(--red9)' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={handleClose} disabled={loading} style={cancelStyle}>Cancel</button>
          <button onClick={handleConfirm} disabled={loading} style={{ ...actionStyle, background: 'var(--orange9, #e67e22)' }}>
            {loading ? 'Kicking…' : 'Kick Member'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

const cancelStyle: React.CSSProperties = {
  background: 'none', border: '1px solid var(--borderColor)', borderRadius: 6,
  padding: '7px 16px', fontSize: 13, color: 'var(--color9)', cursor: 'pointer',
}
const actionStyle: React.CSSProperties = {
  border: 'none', borderRadius: 6, padding: '7px 18px',
  fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer',
}
