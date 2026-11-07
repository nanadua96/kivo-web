import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { nextCookies } from 'better-auth/next-js';
import { emailOTP } from 'better-auth/plugins';
import { client, db } from '@/db/mongodb';

export const auth = betterAuth({
  database:
    process.env.NODE_ENV === 'production'
      ? mongodbAdapter(db, { client })
      : mongodbAdapter(db),
  advanced: {
    database: {
      joins: true,
    },
  },
  emailAndPassword: {
    enabled: false,
  },
  plugins: [
    nextCookies(),
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        if (type === 'sign-in') {
          // Send the OTP for sign in
        } else if (type === 'email-verification') {
          // Send the OTP for email verification
        } else {
          // Send the OTP for password reset
        }
      },
    }),
  ],
  trustedOrigins: ['http://localhost:3000', 'http://127.0.0.1:3000'],
});
