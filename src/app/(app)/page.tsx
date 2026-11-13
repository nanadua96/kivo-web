import { Suspense } from "react";
import { ChatContainer } from "@/components/ChatContainer";
import styles from "./page.module.css";

export default async function HomePage() {
  return (
    <main className={styles.root}>
      <Suspense fallback={<p>Loading...</p>}>
        <ChatContainer conversationId="new" />
      </Suspense>
    </main>
  );
}
