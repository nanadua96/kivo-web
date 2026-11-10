'use client';

import Link from 'next/link';
import { useSidebar } from '@/store';
import styles from './ChatMain.module.css';

type Props = {
  className?: string;
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

type ChatMessage = {
  id?: string;
  _id?: string;
  role: string;
  content: string;
  text?: string;
  timestamp?: string;
  rating?: string;
  attachments?: MessageAttachment[];
};

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_FILE_BYTES = 1024 * 1024;
const TEXT_FILE_EXTENSIONS = new Set([
  'c',
  'cpp',
  'css',
  'csv',
  'h',
  'html',
  'java',
  'js',
  'jsx',
  'json',
  'log',
  'md',
  'py',
  'sh',
  'sql',
  'toml',
  'ts',
  'tsx',
  'txt',
  'xml',
  'yaml',
  'yml',
]);

function isTextFile(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return (
    file.type.startsWith('text/') || TEXT_FILE_EXTENSIONS.has(extension ?? '')
  );
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error(`Could not read ${file.name}.`));
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

import { init } from '@paralleldrive/cuid2';
import { createAuthClient } from 'better-auth/client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import 'highlight.js/styles/github-dark.css';
// import Link from 'next/link';
import AuthModal from './AuthModal';
// import './App.css';
import { ChatPopover } from './ChatPopover';

const BASE_URL = 'http://127.0.0.1:4000';

const createId = init({ length: 24 });

const authClient = createAuthClient();

export default function ChatMain({ className }: Props) {
  //////////////////////////////////////////////////////////////////!
  const expanded = useSidebar((state) => state.expanded);
  const toggleSidebar = useSidebar((state) => state.toggleSidebar);

  const toggleAuthModal = useSidebar((state) => state.toggleAuthModal);
  //////////////////////////////////////////////////////////////////!

  // const { data: session } = useSession({});

  // console.log('🌈🔥💎🔴🔴🧊', session);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState('');
  const [selectedAttachments, setSelectedAttachments] = useState<
    SelectedAttachment[]
  >([]);
  const [attachmentError, setAttachmentError] = useState('');
  const isInputEmpty =
    input.trim().length === 0 && selectedAttachments.length === 0;
  const selectedAttachmentsRef = useRef<SelectedAttachment[]>([]);

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

  const [guestSessionId, setGuestSessionId] = useState(createId());

  console.log('Guest session ID:', guestSessionId);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(false);

  const [chatId, setChatId] = useState('new');

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  const [showClearModal, setShowClearModal] = useState(false);

  async function handleNewChat() {
    if (!isAuthenticated && messages.length) {
      setShowClearModal(true);
      return;
    }

    resetChat();
  }

  async function resetChat() {
    setChatId('new');
    setMessages([]);
  }

  async function handleClearChat() {
    // resetChat();
    // setShowClearModal(false);

    try {
      // console.log(chatId);
      // console.log(
      //   `${BASE_URL}/api/chats/${chatId}?guestSessionId=${guestSessionId}`,
      // );

      const response = await fetch(
        `${BASE_URL}/api/chats/${chatId}?guestSessionId=${guestSessionId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      );

      if (!response.ok) {
        // const data = await response.json();
        // console.log('ERROR DELETEING CONVERSATION', data);
        throw new Error('Failed to delete conversation');
      }

      // Set a
      const newGuestSessionId = createId();
      setGuestSessionId(newGuestSessionId);

      resetChat();
      setShowClearModal(false);
    } catch (err) {
      // setError(true);
      console.error(err);
    } finally {
      // setIsPending(false);
    }
  }

  async function handleCancelClearChat() {
    setShowClearModal(false);
  }

  console.log('Messages', messages);

  ////////////////////////////////////////////////////////! MESSAGE LOGIC

  const [copied, setCopied] = useState(false);

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // reset after 2s
      alert('Copied!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }
  ////////////////////////////////////////////////////////!

  async function rateMessage(id: string, rating: 'up' | 'down') {
    try {
      // console.log(chatId);
      // console.log(
      //   `${BASE_URL}/api/chats/${chatId}?guestSessionId=${guestSessionId}`,
      // );

      const response = await fetch(`${BASE_URL}/api/messages/${id}/feedback`, {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ rating }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to rating');
      }

      setMessages((prev) =>
        prev.map((i) => {
          if (i.role === 'assistant' && i.id === id) {
            return { ...i, rating };
          }

          return i;
        }),
      );
    } catch (err) {
      // setError(true);
      console.error(err);
    } finally {
      // setIsPending(false);
    }
  }

  async function handleRegenerateMessage(id: string) {
    console.log(id);

    // return;
    try {
      const sortedMessages = [...messages].sort((a, b) =>
        (a._id ?? a.id ?? '').localeCompare(b._id ?? b.id ?? ''),
      );

      // console.log(sortedMessages);

      // return;

      const currentMessageIndex = sortedMessages.findIndex((i) => i.id === id);
      const previousMessage = sortedMessages[currentMessageIndex - 1];
      if (!previousMessage?.id) return;
      console.log('Previous message:', previousMessage);

      // return;

      const response = await fetch(
        `${BASE_URL}/api/messages/${previousMessage.id}/regenerate`,
        {
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({ model: 'openai/gpt-oss-120b' }),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        alert('Failed to regenerate');
        throw new Error('Failed to regenerate');
      }

      // const data = await response.json();

      // alert(JSON.stringify(data));

      // return;

      const data = { role: 'assistant', content: 'Test' };

      // const currentMessageIndex = messages.findIndex((i) => i._id === id);
      // console.log(currentMessageIndex);

      const foo = sortedMessages.slice(0, currentMessageIndex);
      const final = [...foo, data];
      // console.log('THEM:', foo);

      setMessages(final);
    } catch (err) {
      // setError(true);
      console.error(err);
    } finally {
      // setIsPending(false);
    }
  }

  ////////////////////////////////////////////////////////////////////////////////! STREAMING
  const [isStreaming, setIsStreaming] = useState(false);

  async function handleSendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const userMessageId = createId();
    const assistantReplyId = createId();

    // return;

    event.preventDefault();
    // if (!input.trim() || isStreaming) return;

    const inputValue = input.trim();
    if ((!inputValue && selectedAttachments.length === 0) || isPending) return;

    setIsPending(true);
    setError(false);
    setAttachmentError('');

    try {
      const attachmentPayload = await Promise.all(
        selectedAttachments.map(
          async ({ file }): Promise<MessageAttachment> => {
            if (isTextFile(file)) {
              return {
                name: file.name,
                type: file.type || 'text/plain',
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

      const textFileContext = attachmentPayload
        .filter((attachment) => attachment.content !== undefined)
        .map(
          (attachment) =>
            `\n\n[Attached text file: ${attachment.name}]\n${attachment.content}\n[End of ${attachment.name}]`,
        )
        .join('');
      const imageContext = attachmentPayload
        .filter((attachment) => attachment.data !== undefined)
        .map((attachment) => attachment.name);
      const userMessageText =
        inputValue ||
        (attachmentPayload.length ? 'Please review the attached file(s).' : '');
      const messageForApi = [
        userMessageText,
        textFileContext,
        imageContext.length
          ? `\n\nAttached image(s): ${imageContext.join(', ')}`
          : '',
      ].join('');

      setIsStreaming(true);

      setMessages((prev) => [
        ...prev,
        {
          id: userMessageId,
          role: 'user',
          content: userMessageText,
          attachments: attachmentPayload,
        },
        { id: assistantReplyId, role: 'assistant', content: '' },
      ]);

      const response = await fetch(
        'http://127.0.0.1:4000/api/stream',
        // 'http://127.0.0.1:4000/api/v1/conversations/stream',
        {
          credentials: 'include',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: messageForApi,
            attachments: attachmentPayload,
            conversationId: 'portfolio-chat-1',
            model: 'qwen/qwen3.8-27b',
            //  model: 'openai/gpt-oss-20b',
          }),
        },
      );

      if (!response.ok) throw new Error('Network response failed');

      if (!response.body)
        throw new Error('The response stream is unavailable.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        // Decode chunk bytes to string and append to buffer
        buffer += decoder.decode(value, { stream: true });

        // SSE messages are separated by double newlines
        const lines = buffer.split('\n\n');
        // Keep the last partial line in the buffer if it didn't end with \n\n
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;

          const jsonStr = trimmed.replace('data:', '').trim();
          if (jsonStr === '[DONE]') {
            setIsStreaming(false);
            break;
          }

          const parsed = JSON.parse(jsonStr);

          if (parsed.content) {
            // Update the last message (the assistant's ongoing response) immutably
            setMessages((prev) => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (!lastMsg) return updated;
              updated[updated.length - 1] = {
                ...lastMsg,
                content: lastMsg.content + parsed.content,
              };
              return updated;
            });

            // setMessages((prev) => {
            //   return prev.map((i) => {
            //     if (i.id === assistantReplyId)
            //       return { ...i, content: parsed.content };
            //     return i;
            //   });
            // });
          }
        }
      }

      setInput('');
      if (inputRef.current) inputRef.current.style.height = 'auto';
      selectedAttachments.forEach(({ previewUrl }) => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
      });
      setSelectedAttachments([]);
    } catch (err) {
      console.error('Streaming client error:', err);
      setError(true);
      setMessages((previous) =>
        previous.filter(
          (message: { id?: string }) =>
            message.id !== userMessageId && message.id !== assistantReplyId,
        ),
      );
    } finally {
      setIsStreaming(false);
      setIsPending(false);
    }
  }
  ////////////////////////////////////////////////////////////////////////////////! STREAMING
  const [showAuth, setShowAuth] = useState(false);

  function handleSignIn() {
    setShowAuth(true);
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
    let validationError = '';

    for (const file of files) {
      const isImage = [
        'image/png',
        'image/jpeg',
        'image/gif',
        'image/webp',
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
        validationError = 'Attachments must total 10 MB or less.';
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
    event.currentTarget.value = '';
  }

  function removeAttachment(id: string) {
    setSelectedAttachments((current) => {
      const attachment = current.find((item) => item.id === id);
      if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }

  return (
    <section className={messages.length === 0 ? 'chat empty' : 'chat'}>
      {/* //////////////////////////////////////////////////////////////////////////////////////* */}
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

        <div className="nav-button-group">
          <button
            type="button"
            className="btn-base btn-outline"
            onClick={toggleAuthModal}
          >
            Sign up
          </button>
          <button
            type="button"
            onClick={toggleAuthModal}
            className="btn-base btn-solid"
          >
            Login
          </button>
        </div>
      </nav>
      {/* //////////////////////////////////////////////////////////////////////////////////////* */}

      <nav className={isAuthenticated ? 'nav no-auth' : 'nav'}>
        {isAuthenticated ? (
          <button
            // onClick={() => openAuthModal('signup')}
            className="hamburger-button"
            onClick={() => setIsOpen(true)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              fill="#1f1f1f"
            >
              <path d="M160-240q-17 0-28.5-11.5T120-280q0-17 11.5-28.5T160-320h640q17 0 28.5 11.5T840-280q0 17-11.5 28.5T800-240H160Zm0-200q-17 0-28.5-11.5T120-480q0-17 11.5-28.5T160-520h640q17 0 28.5 11.5T840-480q0 17-11.5 28.5T800-440H160Zm0-200q-17 0-28.5-11.5T120-680q0-17 11.5-28.5T160-720h640q17 0 28.5 11.5T840-680q0 17-11.5 28.5T800-640H160Z" />
            </svg>
          </button>
        ) : (
          <>
            <button
              // onClick={() => openAuthModal('signup')}
              className="hamburger-button"
              onClick={() => setIsOpen(true)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 -960 960 960"
                width="24px"
                fill="#1f1f1f"
              >
                <path d="M160-240q-17 0-28.5-11.5T120-280q0-17 11.5-28.5T160-320h640q17 0 28.5 11.5T840-280q0 17-11.5 28.5T800-240H160Zm0-200q-17 0-28.5-11.5T120-480q0-17 11.5-28.5T160-520h640q17 0 28.5 11.5T840-480q0 17-11.5 28.5T800-440H160Zm0-200q-17 0-28.5-11.5T120-680q0-17 11.5-28.5T160-720h640q17 0 28.5 11.5T840-680q0 17-11.5 28.5T800-640H160Z" />
              </svg>
            </button>

            <div className="nav-button-group">
              <button
                type="button"
                className="btn-base btn-outline"
                onClick={handleSignIn}
              >
                Sign up
              </button>
              <button
                type="button"
                onClick={handleSignIn}
                className="btn-base btn-solid"
              >
                Login
              </button>
              {/* <Link href="/signup" className="btn-base btn-outline">
                  Sign up
                </Link>
                <Link href="/login" className="btn-base btn-solid">
                  Login
                </Link> */}
            </div>
          </>
        )}
      </nav>
      {/* //! **************** CHAT CONTAINER *****************/}
      <div className="chat-container">
        {messages.map((message, index) => {
          const messageId = message._id ?? message.id;

          if (message.role === 'user') {
            return (
              <div key={index} className="sender-msg-wrapper">
                <div className="sender-bubble">
                  <p>{message.content}</p>
                  {message.attachments && message.attachments.length > 0 && (
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
                <div className="sender-msg-btn-group">
                  <button
                    onClick={() => handleCopy(message.text ?? message.content)}
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
                      <path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-520q0-17 11.5-28.5T160-720q17 0 28.5 11.5T200-680v520h400q17 0 28.5 11.5T640-120q0 17-11.5 28.5T600-80H200Zm160-240v-480 480Z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => console.log('Hello world!')}
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
                      <path d="M200-200h57l391-391-57-57-391 391v57Zm-40 80q-17 0-28.5-11.5T120-160v-97q0-16 6-30.5t17-25.5l505-504q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L313-143q-11 11-25.5 17t-30.5 6h-97Zm600-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          }

          if (message.role === 'assistant') {
            return (
              <div
                key={index}
                style={{ alignSelf: 'flex-start' }}
                className="markdown-body"
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                >
                  {message.content}
                </ReactMarkdown>
                <div className="assistant-msg-btn-group">
                  <button
                    onClick={() => handleCopy(message.content)}
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
                      <path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-520q0-17 11.5-28.5T160-720q17 0 28.5 11.5T200-680v520h400q17 0 28.5 11.5T640-120q0 17-11.5 28.5T600-80H200Zm160-240v-480 480Z" />
                    </svg>
                  </button>
                  {/* Rating up */}
                  <button
                    onClick={() => {
                      if (messageId) rateMessage(messageId, 'up');
                    }}
                    disabled={!messageId}
                    type="button"
                    className="sender-msg-btn"
                  >
                    {message?.rating === 'up' ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
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
                      if (messageId) rateMessage(messageId, 'down');
                    }}
                    disabled={!messageId}
                    type="button"
                    className="sender-msg-btn"
                  >
                    {message?.rating === 'down' ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
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
                        height="24px"
                        viewBox="0 -960 960 960"
                        width="24px"
                        fill="#1f1f1f"
                      >
                        <path d="M120-320q-32 0-56-24t-24-56v-80q0-7 2-15t4-15l120-282q9-20 30-34t44-14h440v520L440-82q-15 15-35.5 17.5T365-72q-19-10-28-28t-4-37l45-183H120Zm480-34v-406H240L120-480v80h360l-54 220 174-174Zm200-486q33 0 56.5 23.5T880-760v360q0 33-23.5 56.5T800-320H680v-80h120v-360H680v-80h120Zm-200 80v406-406Z" />
                      </svg>
                    )}
                  </button>
                  <button
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
                  </button>
                </div>
              </div>
            );
          }

          return null;
        })}

        {error && (
          <div>
            <p style={{ color: 'red' }}>
              Error sending message. Please try again.
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.form?.requestSubmit()}
            >
              Retry
            </button>
          </div>
        )}

        {isPending && (
          <div className="loader"></div>
          // <p style={{ alignSelf: 'flex-start' }}>Waiting for response...</p>
        )}
      </div>

      {/* <div class="loader"></div> */}

      <div className="input-container">
        {messages.length === 0 && (
          <div className="headline-wrapper">
            <p className="headline">What should we explore?</p>
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
              event.currentTarget.style.height = 'auto';
              event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 200)}px`;
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
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
                aria-label="Sending message"
                disabled
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
