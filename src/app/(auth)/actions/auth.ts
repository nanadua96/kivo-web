'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export async function signUpAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const name = formData.get('name') as string;

  await auth.api.signUpEmail({
    body: { email, password, name },
  });

  redirect('/');
}

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  await auth.api.signInEmail({
    body: { email, password },
  });

  redirect('/');
}

export async function logoutAction() {
  await auth.api.signOut({
    headers: await headers(),
  });

  redirect('/');
}
