'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { redirect } from 'next/dist/server/api-utils';
import { useForm } from 'react-hook-form';
import { authClient } from '@/lib/auth-client';
import { type LoginInput, loginSchema } from './schema';

type VerifyOtpFormProps = {
  email: string;
};

export default function VerifyOtpForm({ email }: VerifyOtpFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
  });

  console.log('Email in VerifyOtpForm is:', email);

  async function submitForm(data: LoginInput) {
    try {
      const result = await authClient.signIn.emailOtp({
        email,
        otp: data.code,
      });

      if (result.error) {
        alert('Error verifying OTP');
      }

      console.log('Success:', data);

      console.log('OTP verified!');

      redirect('/');
    } catch (error) {
      console.error('Login failed:', error);
    }
  }

  return (
    <div>
      <h1>Verify your email</h1>

      <form onSubmit={handleSubmit(submitForm)}>
        <div>
          <input type="text" placeholder="OTP" {...register('code')} />
          {errors.code && <p color="red">{errors.code.message}</p>}
        </div>
        <button type="submit" disabled={isSubmitting}>
          Login
        </button>
      </form>
    </div>
  );
}
