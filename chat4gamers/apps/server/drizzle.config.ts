import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizze',
  dialect: 'sqlite',
  dbCredentials: {
    url: 'chat.db',
  },
});