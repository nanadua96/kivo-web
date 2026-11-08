import { Suspense } from 'react';
import { ChatContainer } from '@/components/ChatContainer';

export default async function HomePage() {
  return (
    <main id="root">
      <Suspense fallback={<p>Loading...</p>}>
        <ChatContainer />
      </Suspense>
    </main>
  );
}
