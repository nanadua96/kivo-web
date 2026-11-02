import 'server-only';

import axios from 'axios';
import { cookies } from 'next/headers';

import type { AxiosResponse } from 'axios';

export const SESSION_COOKIE_NAME = 'sessionId';

const SESSION_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

export const fastifyApi = axios.create({
  baseURL: process.env.API_URL,
  timeout: 10_000,
});

/**
 * Transfer the session cookie from Fastify
 * to the browser through Next.js.
 */
export async function storeFastifySession(response: AxiosResponse) {
  const setCookie = response.headers['set-cookie'];

  const setCookieHeaders: string[] = Array.isArray(setCookie)
    ? setCookie
    : typeof setCookie === 'string'
      ? [setCookie]
      : [];

  const sessionCookie = setCookieHeaders.find((cookie) =>
    cookie.startsWith(`${SESSION_COOKIE_NAME}=`),
  );

  if (!sessionCookie) {
    throw new Error('Fastify did not return a session cookie');
  }

  // Extract the cookie value without its attributes.
  const cookiePair = sessionCookie.split(';', 1)[0];

  const encodedValue = cookiePair.slice(SESSION_COOKIE_NAME.length + 1);

  // Decode before Next.js serializes it as a cookie.
  const sessionId = decodeURIComponent(encodedValue);

  if (!sessionId) {
    throw new Error('Invalid session cookie');
  }

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

/**
 * Retrieve the browser's session cookie
 * and prepare it for forwarding to Fastify.
 */
export async function getFastifyCookieHeader() {
  const cookieStore = await cookies();

  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    return null;
  }

  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}`;
}

/**
 * Clear the Next.js session cookie.
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.delete(SESSION_COOKIE_NAME);
}
