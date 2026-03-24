import { members } from './db/schema.js'
import { eq } from 'drizzle-orm'

let ownerPublicKey: string | null = null

export async function initServerState(db: any) {
  const owner = await db.query.members.findFirst({
    where: eq(members.role, 'owner'),
  })
  ownerPublicKey = owner?.userPublicKey ?? null
}

export function getOwnerPublicKey(): string {
  // Todo: handle case where owner hasn't claimed the server
  if (!ownerPublicKey) throw new Error('Server state not initialised')
  return ownerPublicKey
}
