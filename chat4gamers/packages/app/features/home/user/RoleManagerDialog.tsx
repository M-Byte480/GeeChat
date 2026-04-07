'use client'

import { createPortal } from 'react-dom'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { GripVertical, Plus, Trash2, X } from '@tamagui/lucide-icons'
import { apiFetch } from '@my/api-client'

export type EditableRole = {
  id: string
  name: string
  color: string
}

// ── RoleRow ───────────────────────────────────────────────────────────────────
// Isolated component so color-picker drag events only re-render this row,
// not the entire list. Local state tracks name/color; syncs to parent on blur.

type RowProps = {
  role: EditableRole
  index: number
  isOver: boolean
  onUpdate: (index: number, patch: Partial<EditableRole>) => void
  onRemove: (index: number) => void
  onDragStart: (index: number) => void
  onDragOver: (e: React.DragEvent, index: number) => void
  onDrop: (e: React.DragEvent, index: number) => void
  onDragEnd: () => void
}

const RoleRow = memo(function RoleRow({
  role,
  index,
  isOver,
  onUpdate,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: RowProps) {
  const [color, setColor] = useState(role.color)
  const [name, setName] = useState(role.name)

  // Sync if parent resets the role (e.g. fresh fetch after open)
  useEffect(() => { setColor(role.color) }, [role.id, role.color])
  useEffect(() => { setName(role.name) }, [role.id, role.name])

  const commitColor = useCallback(() => {
    if (color !== role.color) onUpdate(index, { color })
  }, [color, role.color, index, onUpdate])

  const commitName = useCallback(() => {
    if (name !== role.name) onUpdate(index, { name })
  }, [name, role.name, index, onUpdate])

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 12px 6px 8px',
        margin: '2px 8px',
        borderRadius: 7,
        background: isOver ? 'var(--color4)' : 'transparent',
        transition: 'background 0.1s',
        borderTop: isOver ? '2px solid var(--blue9)' : '2px solid transparent',
      }}
    >
      {/* Drag handle */}
      <div style={{ color: 'var(--color8)', cursor: 'grab', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <GripVertical size={16} />
      </div>

      {/* Color swatch — clicking opens native color picker */}
      <div style={{ position: 'relative', flexShrink: 0, width: 28, height: 28 }}>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          onBlur={commitColor}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0,
            width: '100%',
            height: '100%',
            cursor: 'pointer',
            border: 'none',
            padding: 0,
          }}
        />
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: color,
            border: '2px solid rgba(255,255,255,0.18)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Hex text input — synced with color picker */}
      <input
        value={color}
        onChange={(e) => {
          const v = e.target.value
          if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setColor(v)
        }}
        onBlur={commitColor}
        maxLength={7}
        spellCheck={false}
        style={{
          width: 80,
          flexShrink: 0,
          background: 'var(--color3)',
          border: '1px solid var(--borderColor)',
          borderRadius: 6,
          padding: '5px 8px',
          fontSize: 12,
          color: 'var(--color)',
          fontFamily: 'monospace',
          outline: 'none',
        }}
      />

      {/* Role name input */}
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commitName}
        placeholder="Role name"
        style={{
          flex: 1,
          background: 'var(--color3)',
          border: '1px solid var(--borderColor)',
          borderRadius: 6,
          padding: '5px 10px',
          fontSize: 14,
          color: 'var(--color)',
          outline: 'none',
        }}
      />

      {/* Delete button */}
      <button
        onClick={() => onRemove(index)}
        title="Remove role"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--red9)',
          padding: 4,
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          opacity: 0.7,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
      >
        <Trash2 size={15} />
      </button>
    </div>
  )
})

// ── RoleManagerDialog ─────────────────────────────────────────────────────────

type Props = {
  open: boolean
  onClose: () => void
  serverUrl: string
}

export function RoleManagerDialog({ open, onClose, serverUrl }: Props) {
  const [mounted, setMounted] = useState(false)
  const [roles, setRoles] = useState<EditableRole[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dragIndex = useRef<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    setError(null)
    apiFetch(serverUrl, '/roles')
      .then((r) => r.json())
      .then((data: Array<{ id: string; name: string; color: string }>) => {
        setRoles(data.map((r) => ({ id: r.id, name: r.name, color: r.color ?? '#5865f2' })))
      })
      .catch(() => setError('Failed to load roles'))
  }, [open, serverUrl])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await apiFetch(serverUrl, '/roles', {
        method: 'PUT',
        body: JSON.stringify(roles),
      })
      if (!res.ok) throw new Error('Server error')
      onClose()
    } catch {
      setError('Failed to save roles')
    } finally {
      setSaving(false)
    }
  }

  const updateRole = useCallback((index: number, patch: Partial<EditableRole>) =>
    setRoles((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r))), [])

  const addRole = () =>
    setRoles((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: 'New Role', color: '#5865f2' },
    ])

  const removeRole = useCallback((index: number) =>
    setRoles((prev) => prev.filter((_, i) => i !== index)), [])

  const handleDragStart = useCallback((index: number) => {
    dragIndex.current = index
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    setOverIndex(index)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    const from = dragIndex.current
    if (from === null || from === index) return
    setRoles((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(index, 0, moved)
      return next
    })
    dragIndex.current = null
    setOverIndex(null)
  }, [])

  const handleDragEnd = useCallback(() => {
    dragIndex.current = null
    setOverIndex(null)
  }, [])

  if (!open || !mounted) return null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)' }}
        onClick={onClose}
      />

      {/* Dialog panel */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: 520,
          maxWidth: '90vw',
          maxHeight: '80vh',
          background: 'var(--background)',
          border: '1px solid var(--borderColor)',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 20px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--borderColor)',
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--color)' }}>
              Manage Roles
            </div>
            <div style={{ fontSize: 12, color: 'var(--color9)', marginTop: 2 }}>
              Drag rows to reorder · changes apply on save
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color9)',
              padding: 4,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Column labels */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 16px 4px 46px',
            flexShrink: 0,
          }}
        >
          <div style={{ width: 28, fontSize: 10, fontWeight: 700, color: 'var(--color9)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Color
          </div>
          <div style={{ width: 80, fontSize: 10, fontWeight: 700, color: 'var(--color9)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Hex
          </div>
          <div style={{ flex: 1, fontSize: 10, fontWeight: 700, color: 'var(--color9)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Role Name
          </div>
        </div>

        {/* Scrollable role list */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0 8px' }}>
          {roles.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color9)', fontSize: 13 }}>
              No roles yet. Add one below.
            </div>
          )}
          {roles.map((role, i) => (
            <RoleRow
              key={role.id}
              role={role}
              index={i}
              isOver={overIndex === i}
              onUpdate={updateRole}
              onRemove={removeRole}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--borderColor)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            flexShrink: 0,
          }}
        >
          {error && (
            <div style={{ fontSize: 12, color: 'var(--red9)', textAlign: 'center' }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              onClick={addRole}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'var(--color4)',
                border: '1px solid var(--borderColor)',
                borderRadius: 6,
                padding: '6px 14px',
                fontSize: 13,
                color: 'var(--color)',
                cursor: 'pointer',
              }}
            >
              <Plus size={14} />
              Add Role
            </button>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={onClose}
                disabled={saving}
                style={{
                  background: 'none',
                  border: '1px solid var(--borderColor)',
                  borderRadius: 6,
                  padding: '6px 16px',
                  fontSize: 13,
                  color: 'var(--color9)',
                  cursor: 'pointer',
                  opacity: saving ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  background: 'var(--blue9)',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#fff',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
