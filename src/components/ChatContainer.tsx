import ChatMain from "./ChatMain";

type Props = {
  conversationId: string;
};

export function ChatContainer({ conversationId }: Props) {
  return <ChatMain key={conversationId} conversationId={conversationId} />;
}
