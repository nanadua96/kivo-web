import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import Chat from '@/components/Chat';
import Sidebar from '@/components/Sidebar';
import { auth } from '@/lib/auth';
import App from '../ref/App';
import { logoutAction } from './actions/auth';

export default async function HomePage() {
  // const session = await auth.api.getSession({
  //   headers: await headers(),
  // });

  // if (!session) {
  //   redirect('/login');
  // }

  return (
    <main id="root">
      {/* <Suspense fallback={<p>Loading...</p>}>
        <h1>Welcome {session.user.name}</h1>
      </Suspense>
      <form action={logoutAction}>
        <button type="submit">Logout</button>
      </form> */}

      {/* <App></App> */}

      {/* <Suspense fallback={<p>Loading sidebar...</p>}>
        <Sidebar />
      </Suspense> */}

      <Suspense fallback={<p>Loading chat...</p>}>
        <Chat />
      </Suspense>
    </main>
  );
}
