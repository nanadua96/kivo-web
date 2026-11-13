"use client";

import { useMutation } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
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

export default function ChatMain({ className, conversationId }: Props) {
  // =============================
  // SIDEBAR
  // =============================
  const expanded = useSidebar((state) => state.expanded);
  const toggleSidebar = useSidebar((state) => state.toggleSidebar);

  const initMessages = useMessages((state) => state.initMessages);
  const messages = useMessages((state) => state.messages);
  const clearMessages = useMessages((state) => state.clearMessages);
  const addMessages = useMessages((state) => state.addMessages);
  const updateMessage = useMessages((state) => state.updateMessage);
  const appendMessageContent = useMessages(
    (state) => state.appendMessageContent,
  );

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messageLoadControllerRef = useRef<AbortController | null>(null);
  const retryRequestRef = useRef<RetryRequest | null>(null);
  const previousConversationIdRef = useRef(conversationId);

  const [input, setInput] = useState("");
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
      alert("Copied!");
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  const rateMessageMutation = useMutation({
    mutationFn: async ({ id, rating }: { id: string; rating: "up" | "down" }) =>
      api.post(`/api/messages/${id}/feedback`, { data: { rating } }),

    onSuccess() {
      console.log("rate message success");
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
    setStoppedMessageId(null);
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
    // console.log("🚨", request.payload);
    // return;

    updateMessage(request.assistantMessageId, "");
    setError("");

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

      if (!response.ok) {
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
          detail ||
            `The request failed (${response.status}). Please try again.`,
        );
      }

      if (!response.body) {
        throw new Error(
          "The response stream is unavailable. Please try again.",
        );
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

        const choices = Array.isArray(payload.choices)
          ? payload.choices[0]
          : undefined;
        const delta =
          choices && typeof choices === "object"
            ? (choices as Record<string, unknown>).delta
            : undefined;
        const deltaContent =
          delta && typeof delta === "object"
            ? (delta as Record<string, unknown>).content
            : undefined;
        const content =
          typeof payload.content === "string"
            ? payload.content
            : typeof deltaContent === "string"
              ? deltaContent
              : "";

        if (content) appendMessageContent(request.assistantMessageId, content);
      };

      while (!receivedDoneEvent && !controller.signal.aborted) {
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

      if (controller.signal.aborted) return;
      buffer += decoder.decode();
      if (!receivedDoneEvent && buffer.trim()) {
        processEvent(buffer);
      }
      if (receivedDoneEvent) await reader.cancel();
      retryRequestRef.current = null;
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

  async function retryLastRequest() {
    const request = retryRequestRef.current;
    if (!request || isPending) return;

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
    if (retryRequestRef.current) {
      setStoppedMessageId(retryRequestRef.current.assistantMessageId);
    }
    abortControllerRef.current?.abort();
  }

  function handleAttachmentSelection(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(event.currentTarget.files ?? []);
    let totalBytes = selectedAttachments.reduce(
      (total, attachment) => total + attachment.file.size,
      0,
    );
    const addedAttachments: SelectedAttachment[] = [];
    let validationError = "";

    for (const file of files) {
      const isImage = [
        "image/png",
        "image/jpeg",
        "image/gif",
        "image/webp",
      ].includes(file.type);
      if (!isImage && !isTextFile(file)) {
        validationError = `${file.name} is not a supported image or text file.`;
        continue;
      }

      if (!isImage && file.size > MAX_TEXT_FILE_BYTES) {
        validationError = `${file.name} is larger than the 1 MB text-file limit.`;
        continue;
      }

      if (
        selectedAttachments.length + addedAttachments.length >=
        MAX_ATTACHMENTS
      ) {
        validationError = `Attach up to ${MAX_ATTACHMENTS} files at a time.`;
        break;
      }

      if (totalBytes + file.size > MAX_ATTACHMENT_BYTES) {
        validationError = "Attachments must total 10 MB or less.";
        continue;
      }

      totalBytes += file.size;
      addedAttachments.push({
        id: createId(),
        file,
        previewUrl: isImage ? URL.createObjectURL(file) : undefined,
      });
    }

    if (addedAttachments.length) {
      setSelectedAttachments((current) => [...current, ...addedAttachments]);
    }
    setAttachmentError(validationError);
    event.currentTarget.value = "";
  }

  function removeAttachment(id: string) {
    setSelectedAttachments((current) => {
      const attachment = current.find((item) => item.id === id);
      if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }

  const [editText, setEditText] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  function toggleEdit(content: string) {
    setEditText(content);
    setIsEditing(!isEditing);
  }

  function handleEditSubmit() {
    console.log("🌈 Edited prompt:", editText);
    toggleEdit("");

    // sumbit code goes here
  }

  //   function handleCancelEdit(text: string) {
  //     setEditText("");
  // toggleEdit("")
  //   }

  return (
    <section
      className={`${className ?? ""} ${styles.container} ${activeMessages.length === 0 ? styles.empty : ""} ${isLoadingConversation || hasConversationLoadError ? styles.hasConversationStatus : ""}`}
    >
      <nav className={styles.nav}>
        {/* <button
          type="button"
          className={styles.hamburgerButton}
          onClick={toggleSidebar}
          aria-label={expanded ? "Collapse sidebar" : "Open sidebar"}
          aria-expanded={expanded}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            height="24px"
            viewBox="0 -960 960 960"
            width="24px"
            fill="#1f1f1f"
          >
            <path d="M160-240q-17 0-28.5-11.5T120-280q0-17 11.5-28.5T160-320h640q17 0 28.5 11.5T840-280q0 17-11.5 28.5T800-240H160Zm0-200q-17 0-28.5-11.5T120-480q0-17 11.5-28.5T160-520h640q17 0 28.5 11.5T840-480q0 17-11.5 28.5T800-440H160Zm0-200q-17 0-28.5-11.5T120-680q0-17 11.5-28.5T160-720h640q17 0 28.5 11.5T840-680q0 17-11.5 28.5T800-640H160Z" />
          </svg>
        </button> */}

        <Link href="https://github.com/nanadua96/kivo-web">GitHub</Link>

        {!expanded && (
          <button
            type="button"
            onClick={toggleSidebar}
            className={`${styles.iconButton} ${styles.sidebarToggleButton}`}
            aria-label="Open sidebar"
            aria-expanded={expanded}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              fill="#1f1f1f"
            >
              <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm280-80h280v-560H480v560Z" />
            </svg>
          </button>
        )}
      </nav>
      {/* ============= Body =============*/}
      {isLoadingConversation && (
        <output className={styles.messageLoading}>
          <span className={styles.messageLoader} aria-hidden="true" />
          <span>Loading conversation...</span>
        </output>
      )}
      {hasConversationLoadError && (
        <div className={styles.messageLoadError} role="alert">
          <p>Could not load this conversation.</p>
          <button type="button" onClick={() => void loadConversation()}>
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
                // Show edit
                if (isEditing) {
                  return (
                    <div key={id} className={styles.userBubbleEdit}>
                      <div className={styles.userBubble}>
                        <input
                          value={editText}
                          onChange={(e) => {
                            setEditText(e.target.value);
                            console.log("User is typing:", e.target.value);
                          }}
                        />
                      </div>
                      <div className={styles.userBubbleButtonGroup}>
                        <button onClick={() => toggleEdit("")} type="button">
                          Cancel
                          {/* <svg
                            xmlns="http://www.w3.org/2000/svg"
                            height="24px"
                            viewBox="0 -960 960 960"
                            width="24px"
                            fill="#1f1f1f"
                          >
                            <path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-520q0-17 11.5-28.5T160-720q17 0 28.5 11.5T200-680v520h400q17 0 28.5 11.5T640-120q0 17-11.5 28.5T600-80H200Zm160-240v-480 480Z" />
                          </svg> */}
                        </button>
                        <button onClick={handleEditSubmit} type="button">
                          Done
                          {/* <svg
                            xmlns="http://www.w3.org/2000/svg"
                            height="24px"
                            viewBox="0 -960 960 960"
                            width="24px"
                            fill="#1f1f1f"
                          >
                            <path d="M200-200h57l391-391-57-57-391 391v57Zm-40 80q-17 0-28.5-11.5T120-160v-97q0-16 6-30.5t17-25.5l505-504q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L313-143q-11 11-25.5 17t-30.5 6h-97Zm600-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z" />
                          </svg> */}
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={id} className={styles.senderBubbleWrapper}>
                    <div className={styles.senderBubble}>
                      <p>{content}</p>
                      {message.attachments &&
                        message.attachments.length > 0 && (
                          <div className={styles.sentAttachments}>
                            {message.attachments.map((attachment) => (
                              <div
                                key={`${attachment.name}-${attachment.type}`}
                                className={styles.sentAttachment}
                              >
                                {attachment.data && (
                                  <Image
                                    src={attachment.data}
                                    alt={attachment.name}
                                    width={42}
                                    height={42}
                                    unoptimized
                                  />
                                )}
                                <span>{attachment.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                    <div className={styles.senderBubbleButtonGroup}>
                      <button
                        onClick={() => handleCopy(message.content)}
                        type="button"
                        aria-label="Copy message"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                          height="24px"
                          viewBox="0 -960 960 960"
                          width="24px"
                          fill="#1f1f1f"
                        >
                          <path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-520q0-17 11.5-28.5T160-720q17 0 28.5 11.5T200-680v520h400q17 0 28.5 11.5T640-120q0 17-11.5 28.5T600-80H200Zm160-240v-480 480Z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => toggleEdit(content)}
                        type="button"
                        aria-label="Edit message"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                          height="24px"
                          viewBox="0 -960 960 960"
                          width="24px"
                          fill="#1f1f1f"
                        >
                          <path d="M200-200h57l391-391-57-57-391 391v57Zm-40 80q-17 0-28.5-11.5T120-160v-97q0-16 6-30.5t17-25.5l505-504q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L313-143q-11 11-25.5 17t-30.5 6h-97Zm600-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              }

              if (message.role === "assistant") {
                return (
                  <div
                    key={id}
                    // style={{ alignSelf: "flex-start" }}
                    className={styles.markdownBody}
                    // className="markdown-body"
                  >
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
                    <div className="assistant-msg-btn-group">
                      <button
                        onClick={() => handleCopy(message.content)}
                        type="button"
                        className="sender-msg-btn"
                        aria-label="Copy message"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                          height="24px"
                          viewBox="0 -960 960 960"
                          width="24px"
                          fill="#1f1f1f"
                        >
                          <path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-520q0-17 11.5-28.5T160-720q17 0 28.5 11.5T200-680v520h400q17 0 28.5 11.5T640-120q0 17-11.5 28.5T600-80H200Zm160-240v-480 480Z" />
                        </svg>
                      </button>
                      {/* Rating up */}
                      <button
                        onClick={() => {
                          if (messageId) rateMessage(messageId, "up");
                        }}
                        disabled={!messageId}
                        type="button"
                        className="sender-msg-btn"
                        aria-label="Rate response positively"
                      >
                        {message?.rating === "up" ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                            height="24px"
                            viewBox="0 -960 960 960"
                            width="24px"
                            fill="#1f1f1f"
                          >
                            <path d="M840-640q32 0 56 24t24 56v80q0 7-1.5 15t-4.5 15L794-168q-9 20-30 34t-44 14H400q-33 0-56.5-23.5T320-200v-407q0-16 6.5-30.5T344-663l217-216q15-14 35.5-17t39.5 7q19 10 27.5 28t3.5 37l-45 184h218ZM160-120q-33 0-56.5-23.5T80-200v-360q0-33 23.5-56.5T160-640q33 0 56.5 23.5T240-560v360q0 33-23.5 56.5T160-120Z" />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                            height="24px"
                            viewBox="0 -960 960 960"
                            width="24px"
                            fill="#1f1f1f"
                          >
                            <path d="M840-640q32 0 56 24t24 56v80q0 7-2 15t-4 15L794-168q-9 20-30 34t-44 14H280v-520l240-238q15-15 35.5-17.5T595-888q19 10 28 28t4 37l-45 183h258Zm-480 34v406h360l120-280v-80H480l54-220-174 174ZM160-120q-33 0-56.5-23.5T80-200v-360q0-33 23.5-56.5T160-640h120v80H160v360h120v80H160Zm200-80v-406 406Z" />
                          </svg>
                        )}
                      </button>
                      {/* Rating down */}
                      <button
                        onClick={() => {
                          if (messageId) rateMessage(messageId, "down");
                        }}
                        disabled={!messageId}
                        type="button"
                        className="sender-msg-btn"
                        aria-label="Rate response negatively"
                      >
                        {message?.rating === "down" ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                            height="24px"
                            viewBox="0 -960 960 960"
                            width="24px"
                            fill="#1f1f1f"
                          >
                            <path d="M120-320q-32 0-56-24t-24-56v-80q0-7 1.5-15t4.5-15l120-282q9-20 30-34t44-14h320q33 0 56.5 23.5T640-760v407q0 16-6.5 30.5T616-297L399-81q-15 14-35.5 17T324-71q-19-10-27.5-28t-3.5-37l45-184H120Zm680-520q33 0 56.5 23.5T880-760v360q0 33-23.5 56.5T800-320q-33 0-56.5-23.5T720-400v-360q0-33 23.5-56.5T800-840Z" />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                            height="24px"
                            viewBox="0 -960 960 960"
                            width="24px"
                            fill="#1f1f1f"
                          >
                            <path d="M120-320q-32 0-56-24t-24-56v-80q0-7 2-15t4-15l120-282q9-20 30-34t44-14h440v520L440-82q-15 15-35.5 17.5T365-72q-19-10-28-28t-4-37l45-183H120Zm480-34v-406H240L120-480v80h360l-54 220 174-174Zm200-486q33 0 56.5 23.5T880-760v360q0 33-23.5 56.5T800-320H680v-80h120v-360H680v-80h120Zm-200 80v406-406Z" />
                          </svg>
                        )}
                      </button>
                      {/* <button
                      onClick={() => {
                        if (messageId) handleRegenerateMessage(messageId);
                      }}
                      disabled={!messageId}
                      type="button"
                      className="sender-msg-btn"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        height="24px"
                        viewBox="0 -960 960 960"
                        width="24px"
                        fill="#1f1f1f"
                      >
                        <path d="M240-478q0 16 2 31.5t7 30.5q5 17-1 32.5T227-361q-16 8-31.5 1.5T175-383q-8-23-11.5-47t-3.5-48q0-134 93-228t227-94h7l-36-36q-11-11-11-28t11-28q11-11 28-11t28 11l104 104q12 12 12 28t-12 28L507-628q-11 11-28 11t-28-11q-11-11-11-28t11-28l36-36h-7q-100 0-170 70.5T240-478Zm480-4q0-16-2-31.5t-7-30.5q-5-17 1-32.5t21-22.5q16-8 31.5-1.5T785-577q8 23 11.5 47t3.5 48q0 134-93 228t-227 94h-7l36 36q11 11 11 28t-11 28q-11 11-28 11t-28-11L349-172q-12-12-12-28t12-28l104-104q11-11 28-11t28 11q11 11 11 28t-11 28l-36 36h7q100 0 170-70.5T720-482Z" />
                      </svg>
                    </button> */}
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
            {retryRequestRef.current && (
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
          <input
            ref={fileInputRef}
            className={styles.fileInput}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp,.txt,.md,.csv,.json,.xml,.html,.css,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.sh,.yaml,.yml,.toml,.log,.sql"
            multiple
            onChange={handleAttachmentSelection}
            aria-label="Attach images or text files"
          />

          {selectedAttachments.length > 0 && (
            <div className={styles.attachmentList}>
              {selectedAttachments.map(({ id, file, previewUrl }) => (
                <div className={styles.attachmentItem} key={id}>
                  {previewUrl ? (
                    <Image
                      src={previewUrl}
                      alt=""
                      width={34}
                      height={34}
                      unoptimized
                    />
                  ) : (
                    <span className={styles.fileBadge} aria-hidden="true">
                      TXT
                    </span>
                  )}
                  <span className={styles.attachmentName} title={file.name}>
                    {file.name}
                  </span>
                  <button
                    type="button"
                    className={styles.removeAttachment}
                    onClick={() => removeAttachment(id)}
                    aria-label={`Remove ${file.name}`}
                    disabled={isPending}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

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
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach images or text files"
              title="Attach images or text files"
              disabled={isPending}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m21.4 11.1-8.5 8.5a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" />
              </svg>
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
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="7" y="7" width="10" height="10" rx="1" />
                </svg>
              </button>
            ) : (
              <button
                className={styles.sendButton}
                type="submit"
                disabled={isInputEmpty}
                aria-label="Send message"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 19V5m-6 6 6-6 6 6" />
                </svg>
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
