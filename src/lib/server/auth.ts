import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';
import axios from 'axios';

import { fastifyApi, getFastifyCookieHeader } from '@/lib/server/fastify';

export type CurrentUser = {
  _id: string;
  name: string;
  email: string;
};

/**
 * Get the authenticated user.
 *
 * Returns null if the user has no valid session.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const cookieHeader = await getFastifyCookieHeader();

  if (!cookieHeader) {
    return null;
  }

  try {
    const response = await fastifyApi.get<{
      user: CurrentUser;
    }>('/api/v1/auth/me', {
      headers: {
        Cookie: cookieHeader,
      },
    });

    return response.data.user;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return null;
    }

    // Don't silently treat network/server errors as logout.
    throw error;
  }
});

/**
 * Require an authenticated user.
 *
 * Redirects guests to the login page.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return user;
}
