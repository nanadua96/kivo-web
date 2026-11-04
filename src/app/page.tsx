import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { logoutAction } from './actions/auth';

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/login');
  }

  return (
    <main>
      <Suspense fallback={<p>Loading...</p>}>
        <h1>Welcome {session.user.name}</h1>
      </Suspense>
      <form action={logoutAction}>
        <button type="submit">Logout</button>
      </form>
    </main>
  );
}
