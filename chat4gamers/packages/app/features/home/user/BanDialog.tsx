'use client'

import { createPortal } from 'react-dom'
import { useState } from 'react'
import { apiFetch } from '@my/api-client'

type BanType = 'permanent' | 'duration' | 'date'
type DurationUnit = 'hours' | 'days' | 'weeks'

const UNIT_MS: Record<DurationUnit, number> = {
  hours: 60 * 60 * 1000,
  days:  24 * 60 * 60 * 1000,
  weeks: 7 * 24 * 60 * 60 * 1000,
}

type Props = {
  open: boolean
  onClose: () => void
  serverUrl: string
  targetPublicKey: string
  targetName: string
}

export function BanDialog({ open, onClose, serverUrl, targetPublicKey, targetName }: Props) {
  const [banType, setBanType] = useState<BanType>('permanent')
  const [duration, setDuration] = useState('7')
  const [unit, setUnit] = useState<DurationUnit>('days')
  const [untilDate, setUntilDate] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open || typeof document === 'undefined') return null

  const computeBanUntil = (): string | undefined => {
    if (banType === 'permanent') return undefined
    if (banType === 'date') return untilDate ? new Date(untilDate).toISOString() : undefined
    // duration
    const ms = parseFloat(duration) * UNIT_MS[unit]
    if (!ms || isNaN(ms)) return undefined
    return new Date(Date.now() + ms).toISOString()
  }

  const handleConfirm = async () => {
    if (banType === 'date' && !untilDate) {
      setError('Please select a date')
      return
    }
    if (banType === 'duration' && (!duration || parseFloat(duration) <= 0)) {
      setError('Please enter a valid duration')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch(serverUrl, '/admin/ban', {
        method: 'POST',
        body: JSON.stringify({
          targetPublicKey,
          reason: reason.trim() || undefined,
          banType,
          banUntil: computeBanUntil(),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to ban member')
      }
      handleClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to ban member')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setBanType('permanent')
    setDuration('7')
    setUnit('days')
    setUntilDate('')
    setReason('')
    setError(null)
    onClose()
  }

  // Min datetime for the date picker = now + 1 minute
  const minDate = new Date(Date.now() + 60_000).toISOString().slice(0, 16)

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={handleClose} />
      <div style={{
        position: 'relative', zIndex: 1, width: 440, maxWidth: '90vw',
        background: 'var(--background)', border: '1px solid var(--borderColor)',
        borderRadius: 12, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        display: 'flex', flexDirection: 'column', gap: 18,
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--color)', marginBottom: 4 }}>
            Ban {targetName}
          </div>
          <div style={{ fontSize: 13, color: 'var(--color9)' }}>
            Banned members cannot rejoin the server.
          </div>
        </div>

        {/* Ban type selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={labelStyle}>Ban Duration</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['permanent', 'duration', 'date'] as BanType[]).map((t) => (
              <button
                key={t}
                onClick={() => setBanType(t)}
                style={{
                  flex: 1, border: '1px solid var(--borderColor)', borderRadius: 6,
                  padding: '6px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: banType === t ? 'var(--red9)' : 'var(--color3)',
                  color: banType === t ? '#fff' : 'var(--color9)',
                  transition: 'background 0.15s',
                }}
              >
                {t === 'permanent' ? 'Permanent' : t === 'duration' ? 'For a duration' : 'Until date'}
              </button>
            ))}
          </div>
        </div>

        {/* Duration inputs */}
        {banType === 'duration' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="number"
              min="1"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              style={{ ...inputStyle, width: 80, flexShrink: 0 }}
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as DurationUnit)}
              style={{ ...inputStyle, flex: 1 }}
            >
              <option value="hours">Hours</option>
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
            </select>
          </div>
        )}

        {/* Date picker */}
        {banType === 'date' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Ban Until</label>
            <input
              type="datetime-local"
              min={minDate}
              value={untilDate}
              onChange={(e) => setUntilDate(e.target.value)}
              style={inputStyle}
            />
          </div>
        )}

        {/* Reason */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={labelStyle}>Reason (optional)</label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter a reason…"
            maxLength={200}
            style={inputStyle}
          />
        </div>

        {error && <div style={{ fontSize: 12, color: 'var(--red9)' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={handleClose} disabled={loading} style={cancelStyle}>Cancel</button>
          <button onClick={handleConfirm} disabled={loading} style={{ ...actionStyle, background: 'var(--red9)' }}>
            {loading ? 'Banning…' : 'Ban Member'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--color9)',
  textTransform: 'uppercase', letterSpacing: 0.8,
}
const inputStyle: React.CSSProperties = {
  background: 'var(--color3)', border: '1px solid var(--borderColor)',
  borderRadius: 6, padding: '8px 12px', fontSize: 14,
  color: 'var(--color)', outline: 'none', width: '100%',
}
const cancelStyle: React.CSSProperties = {
  background: 'none', border: '1px solid var(--borderColor)', borderRadius: 6,
  padding: '7px 16px', fontSize: 13, color: 'var(--color9)', cursor: 'pointer',
}
const actionStyle: React.CSSProperties = {
  border: 'none', borderRadius: 6, padding: '7px 18px',
  fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer',
}
