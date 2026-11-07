'use server';

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { loginSchema } from './schema';

//! FIX TYPES
export async function loginAction(data: any) {
  // console.log('🌕⚡', data);

  const result = loginSchema.safeParse({
    email: data.email,
  });

  if (!result.success) return { errors: result.error.flatten().fieldErrors };

  console.log(result.error);
  // console.log(result.error.flatten().fieldErrors);

  const response = await auth.api.sendVerificationOTP({
    body: { email: data.email, type: 'sign-in' },
  });

  console.log(response);

  //! HANDLE OTP ERROR  IN UI
  if (!response.success) {
    // logic
  }

  redirect('/verify-otp');

  // return { errors: {} };
}
