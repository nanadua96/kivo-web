'use server';

import axios from 'axios';
import { redirect } from 'next/navigation';

import { loginSchema, signupSchema } from '@/lib/auth/schemas';

import type { AuthActionResult } from '@/lib/auth/types';

import {
  clearSessionCookie,
  api,
  getFastifyCookieHeader,
  storeFastifySession,
} from '@/lib/server/fastify';

/********************************************
 * ERROR HANDLING
 ********************************************/

function getSignupError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    switch (error.response?.status) {
      case 409:
        return 'An account with this email already exists.';

      case 429:
        return 'Too many attempts. Please try again later.';
    }
  }

  return 'Unable to create your account. Please try again.';
}

function getLoginError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    switch (error.response?.status) {
      case 401:
        return 'Invalid email or password.';

      case 429:
        return 'Too many login attempts. Please try again later.';
    }
  }

  return 'Unable to log in. Please try again.';
}

/********************************************
 * SIGNUP
 ********************************************/

export async function signupAction(
  _previousState: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? 'Invalid form data',
    };
  }

  try {
    const response = await api.post('/api/v1/auth/signup', parsed.data);

    await storeFastifySession(response);
  } catch (error) {
    return {
      ok: false,
      message: getSignupError(error),
    };
  }

  redirect('/');
}

/********************************************
 * LOGIN
 ********************************************/

export async function loginAction(
  _previousState: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? 'Invalid form data',
    };
  }

  try {
    const response = await api.post('/api/v1/auth/login', parsed.data);

    await storeFastifySession(response);
  } catch (error) {
    return {
      ok: false,
      message: getLoginError(error),
    };
  }

  redirect('/');
}

/********************************************
 * LOGOUT
 ********************************************/

export async function logoutAction() {
  const cookieHeader = await getFastifyCookieHeader();

  try {
    if (cookieHeader) {
      await api.post('/api/v1/auth/logout', null, {
        headers: {
          Cookie: cookieHeader,
        },
      });
    }
  } finally {
    // Always remove the browser's local session cookie.
    await clearSessionCookie();
  }

  redirect('/');
}
