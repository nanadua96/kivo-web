import { Suspense } from "react";
import { ChatContainer } from "@/components/ChatContainer";

// import { ChatContainer } from "@/components/ChatContainer";

// import styles from "./page.module.css";

type Props = {
  params: Promise<{
    conversationId: string;
  }>;
};

export default async function ({ params }: Props) {
  const { conversationId } = await params;

  return (
    <Suspense fallback={<p>Loading...</p>}>
      <Suspense fallback={<p>Loading...</p>}>
        <ChatContainer conversationId={conversationId} />
      </Suspense>
    </Suspense>
  );
}
