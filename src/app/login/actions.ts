'use server';

import { z } from 'zod';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

export async function loginAction(data) {
  const result = loginSchema.safeParse({
    email: data.email,
  });

  if (!result.success) return { errors: result.error.flatten().fieldErrors };

  // Continue with Better Auth OTP login here.

  return { errors: {} };
}
