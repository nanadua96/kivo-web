import { Suspense } from "react";
import { ChatContainer } from "@/components/ChatContainer";
import styles from "./page.module.css";

type Props = {
  params: Promise<{
    conversationId: string;
  }>;
};

export default async function HomePage({ params }: Props) {
  const { conversationId } = await params;

  return (
    <main className={styles.root}>
      {/* <Suspense fallback={<p>Loading...</p>}>
        <ChatContainer />
      </Suspense> */}

      <p>Conversation ID: {conversationId}</p>
    </main>
  );
}
