// import { compare } from 'bcrypt';
// import { sign } from 'hono/jwt';
// import {users} from "../db/schema.js";
// import {eq} from "drizzle-orm";
//
// app.post('/auth/login', async (c) => {
//   const { username, password } = await c.req.json();
//
//   // 1. Find user in SQLite
//   const user = await db.select().from(users).where(eq(users.username, username)).get();
//
//   if (!user) return c.json({ error: "Invalid credentials" }, 401);
//
//   // 2. Compare the password with the stored hash
//   const isValid = await compare(password, user.passwordHash);
//   if (!isValid) return c.json({ error: "Invalid credentials" }, 401);
//
//   // 3. Create a JWT (Session Token)
//   const token = await sign({ id: user.id, username: user.username }, 'YOUR_SECRET_KEY');
//
//   return c.json({ token, user: { id: user.id, username: user.username } });
// });