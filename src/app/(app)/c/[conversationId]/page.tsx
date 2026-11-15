import { Suspense } from "react";
import { ChatContainer } from "@/components/ChatContainer";
import styles from "./page.module.css";

type Props = {
  params: Promise<{
    conversationId: string;
  }>;
};

async function ConversationPageContent({ params }: Props) {
  const { conversationId } = await params;
  return <ChatContainer conversationId={conversationId} />;
}

export default function ConversationPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <output className={styles.loading} aria-label="Loading conversation">
          <span className={styles.spinner} aria-hidden="true" />
        </output>
      }
    >
      <ConversationPageContent params={params} />
    </Suspense>
  );
}
