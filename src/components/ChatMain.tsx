"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Paperclip } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Copy3,
  Edit2,
  // Paperclip,
  Sidebar2,
  Stop,
  ThumbsDown,
  ThumbsUp,
} from "reicon-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useSidebar } from "@/store";
import { useMessages } from "@/store/message.store";
import type { Messages } from "@/types/message.types";
import styles from "./ChatMain.module.css";
import Markdown, { ThinkingIndicator } from "./Markdown";

type Props = {
  className?: string;
  conversationId: string;
};

type SelectedAttachment = {
  id: string;
  file: File;
  previewUrl?: string;
};

type MessageAttachment = {
  name: string;
  type: string;
  content?: string;
  data?: string;
};

type StreamRequest = {
  message: string;
  conversationId: string;
  model: string;
};

type RetryRequest = {
  payload: StreamRequest;
  assistantMessageId: string;
};

type EditRequest = {
  messageId: string;
  message: string;
};

type ConversationLoadState = {
  conversationId: string;
  status: "loading" | "loaded" | "error";
};

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_FILE_BYTES = 1024 * 1024;
const TEXT_FILE_EXTENSIONS = new Set([
  "c",
  "cpp",
  "css",
  "csv",
  "h",
  "html",
  "java",
  "js",
  "jsx",
  "json",
  "log",
  "md",
  "py",
  "sh",
  "sql",
  "toml",
  "ts",
  "tsx",
  "txt",
  "xml",
  "yaml",
  "yml",
]);

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function isTextFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return (
    file.type.startsWith("text/") || TEXT_FILE_EXTENSIONS.has(extension ?? "")
  );
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error(`Could not read ${file.name}.`));
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

async function throwResponseError(response: Response): Promise<never> {
  const responseBody = await response.text();
  let detail = responseBody;

  try {
    const parsedBody: unknown = JSON.parse(responseBody);
    if (parsedBody && typeof parsedBody === "object") {
      const body = parsedBody as Record<string, unknown>;
      const nestedError =
        body.error && typeof body.error === "object"
          ? (body.error as Record<string, unknown>).message
          : body.error;
      const message = body.message ?? nestedError;
      if (typeof message === "string") detail = message;
    }
  } catch {
    // Use the response text when the server does not return JSON.
  }

  throw new Error(
    detail || `The request failed (${response.status}). Please try again.`,
  );
}

function getStreamContent(event: Record<string, unknown>) {
  const choices = Array.isArray(event.choices) ? event.choices[0] : undefined;
  const delta =
    choices && typeof choices === "object"
      ? (choices as Record<string, unknown>).delta
      : undefined;
  const deltaContent =
    delta && typeof delta === "object"
      ? (delta as Record<string, unknown>).content
      : undefined;

  return typeof event.content === "string"
    ? event.content
    : typeof deltaContent === "string"
      ? deltaContent
      : "";
}

async function readEventStream(
  response: Response,
  signal: AbortSignal,
  onEvent: (event: Record<string, unknown>) => void,
) {
  if (!response.body) {
    throw new Error("The response stream is unavailable. Please try again.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let receivedDoneEvent = false;

  const processEvent = (block: string) => {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n")
      .trim();

    if (!data) return;
    if (data === "[DONE]") {
      receivedDoneEvent = true;
      return;
    }

    let event: unknown;
    try {
      event = JSON.parse(data);
    } catch {
      throw new Error("The server sent an invalid streaming response.");
    }
    if (!event || typeof event !== "object") return;

    const payload = event as Record<string, unknown>;
    if (payload.error) {
      const errorValue = payload.error;
      const serverError =
        typeof errorValue === "string"
          ? errorValue
          : errorValue &&
              typeof errorValue === "object" &&
              typeof (errorValue as Record<string, unknown>).message ===
                "string"
            ? ((errorValue as Record<string, unknown>).message as string)
            : "The server could not complete your request.";
      throw new Error(serverError);
    }

    onEvent(payload);
  };

  while (!receivedDoneEvent && !signal.aborted) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() ?? "";
    for (const streamEvent of events) {
      processEvent(streamEvent);
      if (receivedDoneEvent) break;
    }
  }

  if (signal.aborted) return false;
  buffer += decoder.decode();
  if (!receivedDoneEvent && buffer.trim()) processEvent(buffer);
  if (receivedDoneEvent) await reader.cancel();

  return receivedDoneEvent;
}

export default function ChatMain({ className, conversationId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // =============================
  // SIDEBAR
  // =============================
  const expanded = useSidebar((state) => state.expanded);
  const toggleSidebar = useSidebar((state) => state.toggleSidebar);

  const initMessages = useMessages((state) => state.initMessages);
  const messages = useMessages((state) => state.messages);
  const clearMessages = useMessages((state) => state.clearMessages);
  const addMessages = useMessages((state) => state.addMessages);
  const replaceMessagesAfter = useMessages(
    (state) => state.replaceMessagesAfter,
  );
  const updateMessage = useMessages((state) => state.updateMessage);
  const setMessageRating = useMessages((state) => state.setMessageRating);
  const appendMessageContent = useMessages(
    (state) => state.appendMessageContent,
  );

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messageLoadControllerRef = useRef<AbortController | null>(null);
  const retryRequestRef = useRef<RetryRequest | null>(null);
  const editRequestRef = useRef<EditRequest | null>(null);
  const activeAssistantMessageIdRef = useRef<string | null>(null);
  const previousConversationIdRef = useRef(conversationId);

  const [input, setInput] = useState("");
  const [editText, setEditText] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [conversationLoadState, setConversationLoadState] =
    useState<ConversationLoadState>({
      conversationId: "",
      status: "loading",
    });

  const [selectedAttachments, setSelectedAttachments] = useState<
    SelectedAttachment[]
  >([]);
  const [attachmentError, setAttachmentError] = useState("");

  const isInputEmpty =
    input.trim().length === 0 && selectedAttachments.length === 0;
  const activeMessages =
    conversationLoadState.conversationId === conversationId &&
    conversationLoadState.status === "loaded"
      ? messages
      : [];
  const isLoadingConversation =
    conversationId !== "new" &&
    (conversationLoadState.conversationId !== conversationId ||
      conversationLoadState.status === "loading");
  const hasConversationLoadError =
    conversationLoadState.conversationId === conversationId &&
    conversationLoadState.status === "error";

  const selectedAttachmentsRef = useRef<SelectedAttachment[]>([]);

  const loadConversation = useCallback(async () => {
    messageLoadControllerRef.current?.abort();
    const controller = new AbortController();
    messageLoadControllerRef.current = controller;
    clearMessages();

    if (conversationId === "new") {
      setConversationLoadState({ conversationId, status: "loaded" });
      return;
    }

    setConversationLoadState({ conversationId, status: "loading" });

    try {
      const { data } = await api.get<Messages>(
        `/api/v1/conversations/${conversationId}/messages`,
        {
          signal: controller.signal,
        },
      );
      if (!controller.signal.aborted) {
        initMessages(data);
        setConversationLoadState({ conversationId, status: "loaded" });
      }
    } catch (error: unknown) {
      if (!controller.signal.aborted) {
        console.error("Could not load conversation messages.", error);
        setConversationLoadState({ conversationId, status: "error" });
      }
    } finally {
      if (messageLoadControllerRef.current === controller) {
        messageLoadControllerRef.current = null;
      }
    }
  }, [clearMessages, conversationId, initMessages]);

  useEffect(() => {
    void loadConversation();
    return () => {
      messageLoadControllerRef.current?.abort();
      messageLoadControllerRef.current = null;
    };
  }, [loadConversation]);

  useEffect(() => {
    selectedAttachmentsRef.current = selectedAttachments;
  }, [selectedAttachments]);

  useEffect(
    () => () => {
      selectedAttachmentsRef.current.forEach(({ previewUrl }) => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
      });
    },
    [],
  );

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [stoppedMessageId, setStoppedMessageId] = useState<string | null>(null);

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }

  const rateMessageMutation = useMutation({
    mutationFn: async ({ id, rating }: { id: string; rating: "up" | "down" }) =>
      api.post(`/api/v1/messages/${id}/feedback?rating=${rating}`),

    onSuccess(_result, variables) {
      setMessageRating(variables.id, variables.rating);
    },
  });

  function rateMessage(id: string, rating: "up" | "down") {
    rateMessageMutation.mutate({ id, rating });
  }

  useEffect(() => {
    if (previousConversationIdRef.current === conversationId) return;
    previousConversationIdRef.current = conversationId;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    retryRequestRef.current = null;
    editRequestRef.current = null;
    activeAssistantMessageIdRef.current = null;
    setEditingMessageId(null);
    setEditText("");
    setIsPending(false);
    setError("");
  }, [conversationId]);

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  async function handleSendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const inputValue = input.trim();
    if ((!inputValue && selectedAttachments.length === 0) || isPending) return;

    const controller = new AbortController();

    abortControllerRef.current = controller;
    retryRequestRef.current = null;
    editRequestRef.current = null;
    activeAssistantMessageIdRef.current = null;

    setStoppedMessageId(null);
    setEditingMessageId(null);
    setEditText("");
    setIsPending(true);
    setError("");
    setAttachmentError("");

    try {
      const attachmentPayload = await Promise.all(
        selectedAttachments.map(
          async ({ file }): Promise<MessageAttachment> => {
            if (isTextFile(file)) {
              return {
                name: file.name,
                type: file.type || "text/plain",
                content: await file.text(),
              };
            }

            return {
              name: file.name,
              type: file.type,
              data: await readAsDataUrl(file),
            };
          },
        ),
      );
      if (controller.signal.aborted) return;

      const textFileContext = attachmentPayload
        .filter((attachment) => attachment.content !== undefined)
        .map(
          (attachment) =>
            `\n\n[Attached text file: ${attachment.name}]\n${attachment.content}\n[End of ${attachment.name}]`,
        )
        .join("");

      const imageContext = attachmentPayload
        .filter((attachment) => attachment.data !== undefined)
        .map((attachment) => attachment.name);

      const userMessageText =
        inputValue ||
        (attachmentPayload.length ? "Please review the attached file(s)." : "");

      const messageForApi = [
        userMessageText,
        textFileContext,
        imageContext.length
          ? `\n\nAttached image(s): ${imageContext.join(", ")}`
          : "",
      ].join("");

      const userMessageId = createId();

      const assistantMessageId = createId();

      const createdAt = new Date().toISOString();

      addMessages([
        {
          id: userMessageId,
          role: "user",
          content: userMessageText,
          text: userMessageText,
          createdAt,
          attachments: attachmentPayload,
        },
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          text: "",
          createdAt,
        },
      ]);

      const request: RetryRequest = {
        assistantMessageId,
        payload: {
          message: messageForApi,
          conversationId,
          model: "qwen/qwen3.8-27b",
        },
      };

      retryRequestRef.current = request;

      setInput("");

      if (inputRef.current) inputRef.current.style.height = "auto";

      selectedAttachments.forEach(({ previewUrl }) => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
      });

      setSelectedAttachments([]);

      await streamRequest(request, controller);
    } catch (caught: unknown) {
      if (!controller.signal.aborted) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to prepare your message. Please try again.",
        );
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsPending(false);
    }
  }

  async function streamRequest(
    request: RetryRequest,
    controller: AbortController,
  ) {
    updateMessage(request.assistantMessageId, "");

    setError("");

    let createdConversationId: string | null = null;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/conversations`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "text/event-stream",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request.payload),
          signal: controller.signal,
        },
      );

      if (!response.ok) await throwResponseError(response);

      const receivedDoneEvent = await readEventStream(
        response,
        controller.signal,
        (event) => {
          if (
            conversationId === "new" &&
            !createdConversationId &&
            typeof event.conversationId === "string" &&
            event.conversationId !== "new"
          ) {
            createdConversationId = event.conversationId;
            const retryRequest = retryRequestRef.current;
            if (retryRequest) {
              retryRequestRef.current = {
                ...retryRequest,
                payload: {
                  ...retryRequest.payload,
                  conversationId: event.conversationId,
                },
              };
            }
            queryClient.invalidateQueries({
              queryKey: ["conversations"],
            });
          }

          const content = getStreamContent(event);
          if (content) {
            appendMessageContent(request.assistantMessageId, content);
          }
        },
      );
      if (!receivedDoneEvent && !controller.signal.aborted) {
        throw new Error(
          "The server ended the response before it was complete.",
        );
      }
      if (receivedDoneEvent) {
        retryRequestRef.current = null;
        if (createdConversationId && !controller.signal.aborted) {
          router.replace(`/c/${encodeURIComponent(createdConversationId)}`);
        }
      }
    } catch (caught: unknown) {
      if (!controller.signal.aborted) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to send your message. Please try again.",
        );
      }
    }
  }

  function startEditingPrompt(messageId: string, content: string) {
    if (isPending) return;
    retryRequestRef.current = null;
    editRequestRef.current = null;
    setError("");
    setEditingMessageId(messageId);
    setEditText(content);
  }

  function cancelEditingPrompt() {
    setEditingMessageId(null);
    setEditText("");
    editRequestRef.current = null;
    setError("");
  }

  async function streamEditedPrompt(
    request: EditRequest,
    controller: AbortController,
  ) {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/messages/${encodeURIComponent(request.messageId)}/edit`,
      {
        method: "PATCH",
        credentials: "include",
        headers: {
          Accept: "text/event-stream",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: request.message }),
        signal: controller.signal,
      },
    );

    if (!response.ok) await throwResponseError(response);

    let assistantMessageId: string | null = null;

    await readEventStream(response, controller.signal, (event) => {
      if (!assistantMessageId && typeof event.id === "string" && event.id) {
        const replaced = replaceMessagesAfter(
          request.messageId,
          request.message,
          {
            id: event.id,
            role: "assistant",
            content: "",
            text: "",
            createdAt: new Date().toISOString(),
          },
        );

        if (!replaced) {
          throw new Error(
            "This prompt is no longer available to edit. Reload the conversation and try again.",
          );
        }

        assistantMessageId = event.id;

        activeAssistantMessageIdRef.current = event.id;
        setEditingMessageId(null);
        setEditText("");
      }

      const content = getStreamContent(event);
      if (content) {
        if (!assistantMessageId) {
          throw new Error("The server did not identify the edited response.");
        }
        appendMessageContent(assistantMessageId, content);
      }
    });

    if (!controller.signal.aborted && !assistantMessageId) {
      throw new Error("The server did not identify the edited response.");
    }

    if (!controller.signal.aborted) editRequestRef.current = null;
  }

  async function runEditRequest(request: EditRequest) {
    if (isPending) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    activeAssistantMessageIdRef.current = null;
    editRequestRef.current = request;
    setIsPending(true);
    setError("");
    setStoppedMessageId(null);

    try {
      await streamEditedPrompt(request, controller);
    } catch (caught: unknown) {
      if (!controller.signal.aborted) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to update your prompt. Please try again.",
        );
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      if (activeAssistantMessageIdRef.current) {
        activeAssistantMessageIdRef.current = null;
      }
      setIsPending(false);
    }
  }

  function handleEditSubmit(
    event: React.FormEvent<HTMLFormElement>,
    messageId: string,
  ) {
    event.preventDefault();

    const message = editText.trim();

    if (!message) {
      setError("Enter a prompt before submitting.");
      return;
    }

    if (isPending) return;

    runEditRequest({ messageId, message });
  }

  async function retryLastRequest() {
    if (isPending) return;

    const editRequest = editRequestRef.current;
    if (editRequest) {
      await runEditRequest(editRequest);
      return;
    }

    const request = retryRequestRef.current;
    if (!request) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsPending(true);
    setError("");
    setStoppedMessageId(null);

    try {
      await streamRequest(request, controller);
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsPending(false);
    }
  }

  function stopStreaming() {
    const assistantMessageId =
      activeAssistantMessageIdRef.current ??
      retryRequestRef.current?.assistantMessageId;
    if (assistantMessageId) setStoppedMessageId(assistantMessageId);
    abortControllerRef.current?.abort();
  }

  const MESSAGE_BUTTON_COLOR = "#8f8f8f";
  return (
    <section
      className={`${className ?? ""} ${styles.container} ${activeMessages.length === 0 ? styles.empty : ""} ${isLoadingConversation || hasConversationLoadError ? styles.hasConversationStatus : ""}`}
    >
      {/* ============= NAV BAR =============*/}
      <nav className={styles.nav}>
        {!expanded && (
          <button
            type="button"
            onClick={toggleSidebar}
            className={`${styles.iconButton} ${styles.sidebarToggleButton}`}
            aria-label="Open sidebar"
            aria-expanded={expanded}
          >
            <Sidebar2 />
          </button>
        )}
      </nav>
      {/* ============= CHAT =============*/}
      {isLoadingConversation && (
        <output className={styles.messageLoading}>
          <span className={styles.messageLoader} aria-hidden="true" />
          <span>Loading conversation...</span>
        </output>
      )}

      {hasConversationLoadError && (
        <div className={styles.messageLoadError} role="alert">
          <p>Could not load this conversation.</p>
          <button type="button" onClick={loadConversation}>
            Try again
          </button>
        </div>
      )}

      {activeMessages.length > 0 && (
        <div className={styles.chatContainer}>
          <div className={styles.chatWrapper}>
            {activeMessages.map((message) => {
              const messageId = message.id;

              const { id, role, content } = message;

              // User bubble
              if (role === "user") {
                if (editingMessageId === messageId) {
                  return (
                    <form
                      key={id}
                      className={styles.userBubbleEdit}
                      onSubmit={(event) => handleEditSubmit(event, messageId)}
                    >
                      <div className={styles.userBubble}>
                        <textarea
                          value={editText}
                          onChange={(event) => setEditText(event.target.value)}
                          aria-label="Edit prompt"
                          disabled={isPending}
                          rows={3}
                        />
                      </div>
                      <div className={styles.messageBubbleButtonGroup}>
                        <button
                          onClick={cancelEditingPrompt}
                          type="button"
                          disabled={isPending}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isPending || !editText.trim()}
                        >
                          {isPending ? "Updating..." : "Update"}
                        </button>
                      </div>
                    </form>
                  );
                }

                return (
                  <div key={id} className={styles.senderBubbleWrapper}>
                    <div className={styles.senderBubble}>
                      <p>{content}</p>
                    </div>
                    <div
                      className={`${styles.messageButtonGroup} ${styles.senderBubbleButtonGroup}`}
                    >
                      <button
                        onClick={() => handleCopy(message.content)}
                        type="button"
                        aria-label="Copy message"
                        data-tooltip="Copy"
                      >
                        <Copy3 color={MESSAGE_BUTTON_COLOR} />
                      </button>
                      <button
                        onClick={() => startEditingPrompt(messageId, content)}
                        type="button"
                        aria-label="Edit message"
                        data-tooltip="Edit"
                        disabled={isPending}
                      >
                        <Edit2 color={MESSAGE_BUTTON_COLOR} />
                      </button>
                    </div>
                  </div>
                );
              }

              if (message.role === "assistant") {
                return (
                  <div key={id} className={styles.markdownBody}>
                    <Markdown>{message.content}</Markdown>
                    {stoppedMessageId === id && (
                      <div className={styles.stoppedNotice}>
                        <span>Generation stopped.</span>
                        <button
                          type="button"
                          className={styles.retryButton}
                          onClick={retryLastRequest}
                        >
                          Retry
                        </button>
                      </div>
                    )}
                    {/* Button group */}
                    <div className={styles.messageButtonGroup}>
                      {/* Copy */}
                      <button
                        onClick={() => handleCopy(message.content)}
                        type="button"
                        aria-label="Copy message"
                        data-tooltip="Copy"
                      >
                        <Copy3 color={MESSAGE_BUTTON_COLOR} />
                      </button>
                      {/* Rating up */}
                      <button
                        onClick={() => {
                          if (messageId) rateMessage(messageId, "up");
                        }}
                        disabled={!messageId}
                        type="button"
                        aria-label="Rate response positively"
                        data-tooltip="Good response"
                        aria-pressed={message.rating === "up"}
                      >
                        {message?.rating === "up" ? (
                          <ThumbsUp weight="Filled" color="black" />
                        ) : (
                          <ThumbsUp color={MESSAGE_BUTTON_COLOR} />
                        )}
                      </button>
                      {/* Rating down */}
                      <button
                        onClick={() => {
                          if (messageId) rateMessage(messageId, "down");
                        }}
                        disabled={!messageId}
                        type="button"
                        aria-label="Rate response negatively"
                        data-tooltip="Bad response"
                        aria-pressed={message.rating === "down"}
                      >
                        {message?.rating === "down" ? (
                          <ThumbsDown weight="Filled" color="black" />
                        ) : (
                          <ThumbsDown color={MESSAGE_BUTTON_COLOR} />
                        )}
                      </button>
                    </div>
                  </div>
                );
              }

              return null;
            })}

            {isPending && <ThinkingIndicator />}
          </div>
        </div>
      )}

      <div className={styles.inputContainer}>
        {activeMessages.length === 0 && (
          <div className="headline-wrapper">
            <p className="headline">What should we explore?</p>
          </div>
        )}

        {error && (
          <div className={styles.sendError} role="alert">
            <span>{error}</span>
            {(retryRequestRef.current || editRequestRef.current) && (
              <button
                type="button"
                className={styles.retryButton}
                onClick={retryLastRequest}
                disabled={isPending}
              >
                Retry
              </button>
            )}
          </div>
        )}

        <form className="input-wrapper" onSubmit={handleSendMessage}>
          <textarea
            id="chat"
            className="input"
            placeholder="Ask me anything..."
            ref={inputRef}
            value={input}
            rows={1}
            onChange={(event) => {
              setInput(event.target.value);
              event.currentTarget.style.height = "auto";
              event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 200)}px`;
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            disabled={isPending}
          />

          <div className={styles.composerToolbar}>
            <button
              type="button"
              className={styles.attachButton}
              onClick={() => console.log("File input pressed!")}
              aria-label="Attach images or text files"
              title="Attach images or text files"
              disabled={isPending}
            >
              {/* <Paperclip /> */}

              <Paperclip />
              {/* <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m21.4 11.1-8.5 8.5a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" />
              </svg> */}
            </button>

            {attachmentError && (
              <p className={styles.attachmentError} role="alert">
                {attachmentError}
              </p>
            )}

            {isPending ? (
              <button
                type="button"
                className={styles.sendButton}
                aria-label="Stop generating"
                title="Stop generating"
                onClick={stopStreaming}
              >
                {/* <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="7" y="7" width="10" height="10" rx="1" />
                </svg> */}

                <Stop size={24} weight="Filled" />
              </button>
            ) : (
              <button
                className={styles.sendButton}
                type="submit"
                disabled={isInputEmpty}
                aria-label="Send message"
              >
                {/* <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 19V5m-6 6 6-6 6 6" />
                </svg> */}

                <ArrowUp />
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
