import { Suspense } from 'react';
import Chat from '@/components/Chat';

export default async function HomePage() {
  return (
    <main id="root">
      <Suspense fallback={<p>Loading chat...</p>}>
        <Chat />
      </Suspense>
    </main>
  );
}
