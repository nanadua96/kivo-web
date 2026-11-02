import Link from 'next/link';

import { getCurrentUser } from '@/lib/server/auth';
import LogoutButton from '@/components/logout-button';

export default async function HomePage() {
  const user = await getCurrentUser();

  const isAuthenticated = user !== null;

  return (
    <main>
      <h1>My Next.js Application</h1>

      <hr />

      {isAuthenticated ? (
        <section>
          <h2>Welcome back!</h2>

          <p>You are authenticated.</p>

          <h3>Your account</h3>

          <p>Name: {user.name}</p>
          <p>Email: {user.email}</p>

          <p>Authentication status: Authenticated</p>

          <Link href="/dashboard">Go to dashboard</Link>

          <br />

          <LogoutButton />
        </section>
      ) : (
        <section>
          <h2>Hello, guest!</h2>

          <p>You are not authenticated.</p>

          <p>Authentication status: Not authenticated</p>

          <Link href="/login">Login</Link>

          <br />

          <Link href="/signup">Create an account</Link>
        </section>
      )}
    </main>
  );
}
