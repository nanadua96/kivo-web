// 'use client';

// import styles from './Sidebar.module.css';

// export default function Sidebar() {
//   return <div className={styles.test}></div>;
// }

// components/
// ├── chat/
// ChatContainer
// │   ├── ChatWorkspace.tsx       # Parent: sidebar + main chat
// │   ├── ChatSidebar.tsx         # Sidebar container
// │   ├── ChatMain.tsx            # Main chat area
// │   ├── ChatHeader.tsx          # Header / top navigation
// │   ├── ChatMessages.tsx        # Message list
// │   ├── ChatMessage.tsx         # Individual message
// │   ├── ChatInput.tsx           # Prompt input
// │   ├── ChatActions.tsx         # Regenerate, copy, etc.
// │   ├── ConversationList.tsx    # List of previous chats
// │   ├── ConversationItem.tsx    # Individual conversation
// │   └── NewChatButton.tsx       # New chat button

"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PinTack, Sidebar2 } from "reicon-react";
import { api } from "@/lib/api";
import { useSidebar } from "@/store";
import { useMessages } from "@/store/message.store";
import { ChatPopover } from "./ChatPopover";
import styles from "./ChatSidebar.module.css";
import { DeleteConversationModal } from "./DeleteConversationModal";
import { RenameConversationModal } from "./RenameConversationModal";
import SearchModal from "./SearchModal";
import { UserPopover } from "./UserPopover";

const CONVERSATION_PAGE_SIZE = 20;

type Conversation = {
  id: string;
  title: string;
  pinned: boolean;
};

type ConversationPageResponse = {
  docs: Conversation[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
};

type Props = {
  className?: string;
};

export default function ChatSidebar({ className }: Props) {
  const [conversationToRename, setConversationToRename] =
    useState<Conversation | null>(null);

  const [conversationToDelete, setConversationToDelete] =
    useState<Conversation | null>(null);

  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const conversationListRef = useRef<HTMLElement>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();

  const clearMessages = useMessages((state) => state.clearMessages);

  const expanded = useSidebar((state) => state.expanded);

  const toggleSidebar = useSidebar((state) => state.toggleSidebar);

  const conversationQuery = useInfiniteQuery({
    queryKey: ["conversations"],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<ConversationPageResponse>(
        "/api/v1/conversations",
        {
          params: { page: pageParam, limit: CONVERSATION_PAGE_SIZE },
        },
      );
      return {
        docs: data.docs,
        nextPage: data.hasNextPage ? data.nextPage : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });

  const conversations =
    conversationQuery.data?.pages.flatMap((page) => page.docs) ?? [];

  useEffect(() => {
    const root = conversationListRef.current;
    const sentinel = loadMoreSentinelRef.current;
    if (
      !root ||
      !sentinel ||
      !conversationQuery.hasNextPage ||
      conversationQuery.isFetchingNextPage ||
      conversationQuery.isFetchNextPageError
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          conversationQuery.fetchNextPage();
        }
      },
      { root, rootMargin: "0px 0px 120px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    conversationQuery.fetchNextPage,
    conversationQuery.hasNextPage,
    conversationQuery.isFetchNextPageError,
    conversationQuery.isFetchingNextPage,
  ]);

  const renameMutation = useMutation({
    mutationFn: async ({ id, newTitle }: { id: string; newTitle: string }) => {
      console.log("WATCH ME", { id, newTitle });
      return api.post(`/api/v1/conversations/${id}/rename`, {
        title: newTitle,
      });
    },
    // onMutate: (variables) => {
    //   console.log('[conversation:rename] started', variables);
    // },
    onSuccess: (result, variables) => {
      console.log("[conversation:rename] succeeded", { variables, result });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error, variables) => {
      console.error("[conversation:rename] failed", { variables, error });
    },
    // onSettled: (result, error, variables) => {
    //   console.log('[conversation:rename] settled', {
    //     variables,
    //     result,
    //     error,
    //   });
    // },
  });

  const pinMutation = useMutation({
    mutationFn: async (id: string) =>
      api.post(`/api/v1/conversations/${id}/pin`),
    onMutate: (id) => {
      console.log("[conversation:pin] started", { id });
    },
    onSuccess: (result, id) => {
      console.log("[conversation:pin] succeeded", { id, result });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error, id) => {
      console.error("[conversation:pin] failed", { id, error });
    },
    onSettled: (result, error, id) => {
      console.log("[conversation:pin] settled", { id, result, error });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/v1/conversations/${id}`);
    },
    onMutate: (id) => {
      console.log("[conversation:delete] started", { id });
    },
    onSuccess: (result, id) => {
      console.log("[conversation:delete] succeeded", { id, result });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error, id) => {
      console.error("[conversation:delete] failed", { id, error });
    },
    onSettled: (result, error, id) => {
      console.log("[conversation:delete] settled", { id, result, error });
    },
  });

  const router = useRouter();
  const pathname = usePathname();
  const selectedConversationId = pathname.startsWith("/c/")
    ? pathname.slice(3)
    : null;

  function handleChat(id: string) {
    router.push(`/c/${id}`);
  }

  const closeSearch = useCallback(() => setIsSearchOpen(false), []);

  const selectSearchResult = useCallback(
    (id: string) => {
      setIsSearchOpen(false);
      router.push(`/c/${id}`);
    },
    [router],
  );

  function handleNewChat() {
    clearMessages();
    router.push("/c/new");
  }

  return (
    <>
      <aside
        className={`${styles.sidebar} ${expanded ? styles.expanded : styles.collapsed} ${className ?? ""}`}
        aria-hidden={!expanded}
        inert={!expanded}
      >
        {/* ======== HEADER ======== */}
        <header className={styles.sidebarHeader}>
          <p className={styles.logo}>Kivo</p>
          <div className={styles.sidebarHeaderGroup}>
            <button
              type="button"
              onClick={toggleSidebar}
              className={styles.iconButton}
              aria-label="Collapse sidebar"
            >
              <Sidebar2 />
            </button>
          </div>
        </header>
        <section className={styles.sidebarRow2}>
          <button
            onClick={handleNewChat}
            type="button"
            className={styles.newChatButton}
          >
            New chat
          </button>
        </section>

        {conversationQuery.isError && !conversationQuery.data ? (
          <div className={styles.conversationState} role="alert">
            <p>Could not load conversations.</p>
            <button
              type="button"
              onClick={() => void conversationQuery.refetch()}
            >
              Retry
            </button>
          </div>
        ) : (
          <section
            ref={conversationListRef}
            className={`${styles.conversationList} sidebar-row-3`}
            aria-label="Recent conversations"
          >
            <p>Chats</p>
            {conversationQuery.isPending && (
              <div className={styles.conversationState} role="status">
                <span className={styles.loader} aria-hidden="true" />
                <span>Loading conversations...</span>
              </div>
            )}

            {conversations.map((c) => (
              <div
                key={c.id}
                data-conversation-item
                data-conversation-pinned={c.pinned ? "true" : undefined}
                className={`${styles.conversationItem} ${selectedConversationId === c.id ? styles.selected : ""}`}
                onClick={() => handleChat(c.id)}
              >
                <button
                  type="button"
                  className={`${styles.conversationTitle} sidebar-chat-title`}
                  aria-current={
                    selectedConversationId === c.id ? "page" : undefined
                  }
                  onClick={(event) => {
                    event.stopPropagation();
                    handleChat(c.id);
                  }}
                  title={c.title}
                >
                  {c.title}
                </button>

                <div
                  className={`${styles.conversationItemButtonGroup} ${c.pinned ? styles.pinnedConversationGroup : ""}`}
                >
                  {c.pinned && (
                    <span className={styles.pinnedMarker} aria-label="Pinned">
                      <div
                        className={styles.conversationItemButton}
                        title={
                          c.pinned ? "Unpin conversation" : "Pin conversation"
                        }
                      >
                        <PinTack weight="Filled" />
                      </div>
                    </span>
                  )}

                  <ChatPopover
                    isPinned={c.pinned}
                    onRename={() => setConversationToRename(c)}
                    onPin={() => pinMutation.mutate(c.id)}
                    onDelete={() => setConversationToDelete(c)}
                  />
                </div>

                {/* <div
                  className={`${styles.conversationItemButtonGroup} ${c.pinned ? styles.pinnedConversationGroup : ''}`}
                >
                  <ChatPopover
                    isPinned={c.pinned}
                    onRename={() => setConversationToRename(c)}
                    onPin={() => pinMutation.mutate(c.id)}
                    onDelete={() => setConversationToDelete(c)}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      pinMutation.mutate(c.id);
                    }}
                    className={styles.conversationItemButton}
                    data-pinned={c.pinned || undefined}
                    aria-label={
                      c.pinned ? 'Unpin conversation' : 'Pin conversation'
                    }
                    title={c.pinned ? 'Unpin conversation' : 'Pin conversation'}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      height="24px"
                      viewBox="0 -960 960 960"
                      width="24px"
                      fill="#1f1f1f"
                    >
                      <path d="M640-760v280l68 68q6 6 9 13.5t3 15.5v23q0 17-11.5 28.5T680-320H520v234q0 17-11.5 28.5T480-46q-17 0-28.5-11.5T440-86v-234H280q-17 0-28.5-11.5T240-360v-23q0-8 3-15.5t9-13.5l68-68v-280q-17 0-28.5-11.5T280-800q0-17 11.5-28.5T320-840h320q17 0 28.5 11.5T680-800q0 17-11.5 28.5T640-760Z" />
                    </svg>
                  </button>
                </div> */}
              </div>
            ))}

            {conversations.length === 0 && !conversationQuery.isPending && (
              <p className={styles.conversationState}>No conversations yet.</p>
            )}

            {conversationQuery.isFetchNextPageError ? (
              <div className={styles.conversationState} role="alert">
                <p>Could not load more conversations.</p>
                <button
                  type="button"
                  onClick={() => void conversationQuery.fetchNextPage()}
                >
                  Retry
                </button>
              </div>
            ) : conversationQuery.isFetchingNextPage ? (
              <div className={styles.conversationState} role="status">
                <span className={styles.loader} aria-hidden="true" />
                <span>Loading more conversations...</span>
              </div>
            ) : null}
            {conversationQuery.hasNextPage && (
              <div
                ref={loadMoreSentinelRef}
                className={styles.loadMoreSentinel}
                aria-hidden="true"
              />
            )}
          </section>
        )}

        <div className={styles.profileFooter}>
          <UserPopover />
        </div>
      </aside>
      {/* =========== MODALS =========== */}
      {conversationToRename && (
        <RenameConversationModal
          currentTitle={conversationToRename.title}
          isPending={renameMutation.isPending}
          onClose={() => setConversationToRename(null)}
          onRename={async (title) => {
            await renameMutation.mutateAsync({
              id: conversationToRename.id,
              newTitle: title,
            });

            setConversationToRename(null);
          }}
        />
      )}
      {conversationToDelete && (
        <DeleteConversationModal
          title={conversationToDelete.title}
          isPending={deleteMutation.isPending}
          onClose={() => setConversationToDelete(null)}
          onConfirm={async () => {
            await deleteMutation.mutateAsync(conversationToDelete.id);
            setConversationToDelete(null);
          }}
        />
      )}
    </>
  );
}
