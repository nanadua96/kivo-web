'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useActionState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { loginAction } from './actions';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, {
    errors: {},
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
  });

  async function onSubmit(data: LoginInput) {
    console.log(data);
    try {
      const result = await loginAction(data);

      if (!result.success) {
        // Display server-side validation errors
        Object.entries(result.errors).forEach(([field, messages]) => {
          if (messages?.[0]) {
            setError(field as keyof LoginInput, {
              type: 'server',
              message: messages[0],
            });
          }
        });

        return;
      }

      // Successfully triggered OTP
      console.log('OTP sent!');
    } catch (error) {
      console.error('Login failed:', error);
    }
  }

  return (
    <div>
      <h1>Login</h1>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div>
          <input type="email" placeholder="Email" {...register('email')} />
          {errors.email && <p color="red">{errors.email.message}</p>}
        </div>
        <button type="submit" disabled={isSubmitting}>
          Login
        </button>
      </form>
    </div>
  );
}
