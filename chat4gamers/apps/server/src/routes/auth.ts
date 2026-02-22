import { Hono } from 'hono';
import { hash, compare } from 'bcrypt';
import { db } from '../db/index.js'; // Import your db instance
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const auth = new Hono();

auth.post('/register', async (c) => {
  const { username, password } = await c.req.json();
  const passwordHash = await hash(password, 10);

  try {
    await db.insert(users).values({
      id: crypto.randomUUID(),
      username,
      passwordHash,
    });
    return c.json({ message: 'User created' }, 201);
  } catch (e) {
    return c.json({ error: 'User already exists' }, 400);
  }
});

auth.post('/login', async (c) => {
  const { username, password } = await c.req.json();
  const user = await db.select().from(users).where(eq(users.username, username)).get();

  if (!user || !(await compare(password, user.passwordHash))) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  // You'd generate your JWT here
  return c.json({ success: true, user: { username: user.username } });
});

export default auth;