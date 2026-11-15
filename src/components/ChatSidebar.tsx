"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useSidebar } from "@/store";
import { useMessages } from "@/store/message.store";
import { AddCircleFilled, PanelLeftDefault, Pin, PinFilled } from "@/ui";
import { ChatPopover } from "./ChatPopover";
import styles from "./ChatSidebar.module.css";
import { DeleteConversationModal } from "./DeleteConversationModal";
import { RenameConversationModal } from "./RenameConversationModal";
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
  const queryKey = ["conversations"];

  const [conversationToRename, setConversationToRename] =
    useState<Conversation | null>(null);

  const [conversationToDelete, setConversationToDelete] =
    useState<Conversation | null>(null);

  const conversationListRef = useRef<HTMLElement>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();

  const clearMessages = useMessages((state) => state.clearMessages);

  const expanded = useSidebar((state) => state.expanded);

  const toggleSidebar = useSidebar((state) => state.toggleSidebar);

  const conversationQuery = useInfiniteQuery({
    queryKey,
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
      return api.post(`/api/v1/conversations/${id}/rename`, {
        title: newTitle,
      });
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },

    onError: (error, variables) => {
      // console.error("[conversation:rename] failed", { variables, error });
    },
  });

  const pinMutation = useMutation({
    mutationFn: async (id: string) =>
      api.post(`/api/v1/conversations/${id}/pin`),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },

    onError: () => {
      toast.error("Something went wrong.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/v1/conversations/${id}`);
    },

    onSuccess() {
      queryClient.invalidateQueries({ queryKey });
    },

    onError(error, id) {
      // console.error("[conversation:delete] failed", { id, error });
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
              <PanelLeftDefault />
            </button>
          </div>
        </header>
        <section className={styles.sidebarRow2}>
          <button
            onClick={handleNewChat}
            type="button"
            className={styles.newChatButton}
          >
            <AddCircleFilled />
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
                        {c.pinned ? <PinFilled /> : <Pin />}
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
            const deletedId = conversationToDelete.id;
            await deleteMutation.mutateAsync(deletedId);
            if (selectedConversationId === deletedId) {
              clearMessages();
              router.push("/c/new");
            }
            setConversationToDelete(null);
          }}
        />
      )}
    </>
  );
}
