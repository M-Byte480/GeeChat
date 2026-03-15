import { Hono } from 'hono';
import { db } from '../db/index.js'; // Import your db instance
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const auth = new Hono();

auth.post('/register', async (c) => {
  const { username, publicKey } = await c.req.json();

  try {
    await db.insert(users).values({
      publicKey,
      username,
    });
    return c.json({ message: 'User created' }, 201);
  } catch (e) {
    return c.json({ error: 'User already exists' }, 400);
  }
});

auth.post('/login', async (c) => {
  const { username } = await c.req.json();
  const user = await db.select().from(users).where(eq(users.username, username)).get();

  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  // You'd generate your JWT here
  return c.json({ success: true, user: { username: user.username } });
});

export default auth;