import {Context, Next} from "hono";
import {db} from "../db/index.js";
import {and, eq, inArray} from "drizzle-orm";
import {members} from "../db/schema.js";
import {verifyToken} from "./authentication.js";

export async function requireAuth(c: Context, next: Next) {
  // Todo: user has to exists
  // todo: not banned or denied or inactive or awaiting_to_join // inactive = left server
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  const user = await verifyToken(token)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  c.set('user', user) // attach to context for downstream use
  await next()
}

export async function requireAdmin(c: Context, next: Next) {
  const user = c.get('user')
  const member = await db.query.members.findFirst({
    where: and(
      eq(members.userPublicKey, user.publicKey),
      inArray(members.role, ['owner', 'admin'])
    )
  })

  if (!member) return c.json({ error: 'Forbidden' }, 403)
  await next()
}