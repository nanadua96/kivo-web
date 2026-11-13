import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { client, db } from "@/db/mongodb";
import { sendOTPEmail } from "./email";

export const auth = betterAuth({
  database:
    process.env.NODE_ENV === "production"
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
  user: {
    deleteUser: {
      enabled: true,
    },
  },
  plugins: [
    nextCookies(),
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        if (type === "sign-in") await sendOTPEmail({ to: email, otp, type });
      },
    }),
  ],
  trustedOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"],
});
