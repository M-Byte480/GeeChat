import { PopoverMenu } from './PopoverMenu'
import type { UserProfile } from '../hooks/useUser'
import type { ReactNode } from 'react'
import { StatusChip } from 'app/features/home/components/StatusChip'
import type { MemberRole } from 'app/features/home/components/DropdownMenu'

interface Props {
  user: UserProfile
  trigger: (open: () => void) => ReactNode
  /** If provided, shows admin action buttons for eligible viewers */
  currentUserRole?: MemberRole | null
  onKick?: () => void
  onBan?: () => void
}

export function ViewUserPopover({ user, trigger, currentUserRole, onKick, onBan }: Props) {
  const canModerate =
    (currentUserRole === 'admin' || currentUserRole === 'owner') &&
    user.role !== 'owner' &&
    onKick &&
    onBan
  return (
    <PopoverMenu trigger={trigger} width={280}>
      {/* Banner + Avatar */}
      <div style={{ background: 'var(--blue8)', height: 60 }} />
      <div style={{ padding: '0 16px', marginTop: -28 }}>
        <div style={{ position: 'relative', width: 60, height: 60 }}>
          <img
            src={user.avatarUrl || 'https://placehold.co/100x100'}
            draggable={false}
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              objectFit: 'cover',
              boxShadow: '0 0 0 4px var(--color2)',
              display: 'block',
            }}
          />
          <div
            style={{ position: 'absolute', bottom: 0, right: 0, zIndex: 10 }}
          >
            <StatusChip status={user.status} />
          </div>
        </div>

        {/* Name */}
        <div style={{ marginTop: 8, marginBottom: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--color)' }}>
            {user.nickname ?? user.username}
          </div>
          {user.nickname && (
            <div style={{ fontSize: 12, color: 'var(--color9)', marginTop: 2 }}>
              {user.username}
            </div>
          )}
        </div>

        <hr
          style={{
            border: 'none',
            borderTop: '1px solid var(--borderColor)',
            margin: '0 0 12px',
          }}
        />

        {/* Roles */}
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--color9)',
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 6,
            }}
          >
            Roles
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {/* Built-in role chip */}
            <div
              style={{
                background: 'var(--color4)',
                borderRadius: 4,
                padding: '2px 8px',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--color)',
              }}
            >
              {user.role}
            </div>
            {/* Custom role chips */}
            {user.customRoles?.map((r) => (
              <div
                key={r.id}
                style={{
                  background: r.color ? `${r.color}33` : 'var(--blue4)',
                  borderRadius: 4,
                  padding: '2px 8px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: r.color ?? 'var(--blue11)',
                  border: `1px solid ${r.color ?? 'var(--blue6)'}`,
                }}
              >
                {r.name}
              </div>
            ))}
          </div>
        </div>

        <hr
          style={{
            border: 'none',
            borderTop: '1px solid var(--borderColor)',
            margin: '0 0 12px',
          }}
        />

        {/* Admin actions */}
        {canModerate && (
          <>
            <hr style={{ border: 'none', borderTop: '1px solid var(--borderColor)', margin: '0 0 12px' }} />
            <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
              <button
                onClick={onKick}
                style={{
                  flex: 1, background: 'var(--color4)', border: '1px solid var(--borderColor)',
                  borderRadius: 6, padding: '6px 0', fontSize: 12, fontWeight: 600,
                  color: 'var(--orange10, #e67e22)', cursor: 'pointer',
                }}
              >
                Kick
              </button>
              <button
                onClick={onBan}
                style={{
                  flex: 1, background: 'var(--red4)', border: '1px solid var(--red6)',
                  borderRadius: 6, padding: '6px 0', fontSize: 12, fontWeight: 600,
                  color: 'var(--red10)', cursor: 'pointer',
                }}
              >
                Ban
              </button>
            </div>
          </>
        )}

        {/* Member since */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--color9)',
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 4,
            }}
          >
            Member Since
          </div>
          <div style={{ fontSize: 13, color: 'var(--color)' }}>
            {user.joinedAt
              ? new Date(user.joinedAt).toLocaleDateString([], {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : 'Unknown'}
          </div>
        </div>
      </div>
    </PopoverMenu>
  )
}
