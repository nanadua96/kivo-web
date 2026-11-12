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
import { createAuthClient } from "better-auth/client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useSidebar } from "@/store";
import { useMessages } from "@/store/message.store";
import { ChatPopover } from "./ChatPopover";
import styles from "./ChatSidebar.module.css";
import { DeleteConversationModal } from "./DeleteConversationModal";
import { RenameConversationModal } from "./RenameConversationModal";
import { UserPopover } from "./UserPopover";

const BASE_URL = "http://127.0.0.1:4000";

const authClient = createAuthClient();
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

type ConversationPage = {
  docs: Conversation[];
  nextPage: number | null;
};

type Props = {
  className?: string;
};

export default function ChatSidebar({ className }: Props) {
  const [chatId, setChatId] = useState("new");

  const [conversationToRename, setConversationToRename] =
    useState<Conversation | null>(null);

  const [conversationToDelete, setConversationToDelete] =
    useState<Conversation | null>(null);

  const [isAuthenticated, setIsAuthenticated] = useState(false); //! GET FROM AUTH CLIENT

  const conversationListRef = useRef<HTMLElement>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();

  const clearMessages = useMessages((state) => state.clearMessages);

  async function hello() {
    console.log("Running...");
    const a = await authClient.getSession();
    console.log("🌈🔥💎🔴🔴🧊", a);

    if (!a.data) setIsAuthenticated(false);
    else setIsAuthenticated(true);
  }

  async function ping() {
    try {
      const res = await fetch(BASE_URL + "/ping");

      if (!res.ok) {
        console.log("[/ping] error:");
        console.log(res);
        return;
      }

      console.log("Server ping success");
    } catch (error) {
      console.log("[/ping] error:", error);
    }
  }

  useEffect(() => {
    hello();
    ping();
  }, []);

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

  console.log("🚨", conversationQuery.data);

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
          void conversationQuery.fetchNextPage();
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

  function handleChat(id: string) {
    setChatId(id);
  }

  function handleNewChat() {
    clearMessages();
  }

  return (
    <>
      <aside
        className={` ${styles.sidebar} ${expanded ? styles.expanded : styles.collapsed} ${className ?? ""}`}
        aria-hidden={!expanded}
        inert={!expanded}
      >
        {/* ======== HEADER ======== */}
        <header className={styles.sidebarHeader}>
          <p className={styles.logo}>Kivo</p>
          <div className={styles.sidebarHeaderGroup}>
            <button
              type="button"
              // onClick={handleSearch}
              className={styles.iconButton}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 -960 960 960"
                width="24px"
                fill="#1f1f1f"
              >
                <path d="M380-320q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l224 224q11 11 11 28t-11 28q-11 11-28 11t-28-11L532-372q-30 24-69 38t-83 14Zm0-80q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={toggleSidebar}
              className={styles.iconButton}
              aria-label="Collapse sidebar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 -960 960 960"
                width="24px"
                fill="#1f1f1f"
              >
                <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm280-80h280v-560H480v560Z" />
              </svg>
            </button>
          </div>
        </header>

        {/* <div className="sidebar-row-2">
            <button onClick={handleNewChat} className={styles.sidebarBtn}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 -960 960 960"
                width="24px"
                fill="#1f1f1f"
              >
                <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h357l-80 80H200v560h560v-278l80-80v358q0 33-23.5 56.5T760-120H200Zm280-360ZM360-360v-170l367-367q12-12 27-18t30-6q16 0 30.5 6t26.5 18l56 57q11 12 17 26.5t6 29.5q0 15-5.5 29.5T897-728L530-360H360Zm481-424-56-56 56 56ZM440-440h56l232-232-28-28-29-28-231 231v57Zm260-260-29-28 29 28 28 28-28-28Z" />
              </svg>
              <span>New chat</span>
            </button>
          </div> */}

        <section className="sidebar-row-2">
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
            <p>Recents</p>
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
                className={`${styles.conversationItem} ${chatId === c.id ? styles.selected : ""}`}
                onClick={() => handleChat(c.id)}
              >
                <button
                  type="button"
                  className={`${styles.conversationTitle} sidebar-chat-title`}
                  onClick={() => handleChat(c.id)}
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
                        type="button"
                        className={styles.conversationItemButton}
                        title={
                          c.pinned ? "Unpin conversation" : "Pin conversation"
                        }
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
      {conversationToRename && (
        <RenameConversationModal
          currentTitle={conversationToRename.title}
          isPending={renameMutation.isPending}
          onClose={() => setConversationToRename(null)}
          onRename={async (title) => {
            // console.log(title);
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
