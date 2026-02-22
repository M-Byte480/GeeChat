// import { hash } from 'bcrypt';
// import { v4 as uuidv4 } from 'uuid';
//
// app.post('/auth/register', async (c) => {
//   const { username, password } = await c.req.json();
//
//   // 1. Hash the password (Never store the raw string!)
//   const passwordHash = await hash(password, 10);
//   const userId = uuidv4();
//
//   try {
//     // 2. Insert into the 'users' table we defined
//     await db.insert(users).values({
//       id: userId,
//       username,
//       passwordHash,
//     });
//
//     return c.json({ success: true, userId });
//   } catch (e) {
//     return c.json({ error: "Username already exists" }, 400);
//   }
// });