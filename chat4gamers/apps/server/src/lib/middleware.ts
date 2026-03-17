import {Context, Next} from "hono";
import {db} from "../db/index.js";
import {and, eq, inArray} from "drizzle-orm";
import {members, sessions, users} from "../db/schema.js";

export async function requireAuth(c: Context, next: Next)  {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const session = db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .get();

  if (!session || session.expiresAt < new Date()) {
    return c.json({ error: 'Session expired' }, 401);
  }

  const user = db
    .select()
    .from(users)
    .where(eq(users.publicKey, session.publicKey))
    .get();

  c.set('user', user);

  await next();
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
