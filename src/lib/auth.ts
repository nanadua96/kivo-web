import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { nextCookies } from 'better-auth/next-js';
import { client, db } from '@/db/mongodb';

export const auth = betterAuth({
  database:
    process.env.NODE_ENV === 'production'
      ? mongodbAdapter(db, { client })
      : mongodbAdapter(db),
  advanced: { database: { joins: true } },
  emailAndPassword: { enabled: true },
  plugins: [nextCookies()],
  trustedOrigins: ['http://localhost:3000', 'http://127.0.0.1:3000'],
});
