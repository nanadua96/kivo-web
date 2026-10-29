import { useRef, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { init } from '@paralleldrive/cuid2';

import 'highlight.js/styles/github-dark.css';
import './App.css';
import { ChatPopover } from './ChatPopover';

const BASE_URL = import.meta.env.VITE_API_URL;

const createId = init({ length: 24 });

function App() {
  const inputRef = useRef(null);

  const [guestSessionId, setGuestSessionId] = useState(createId());

  console.log('Guest session ID:', guestSessionId);

  const [messages, setMessages] = useState([]);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(false);

  const [chatId, setChatId] = useState('new');
  const [chats, setChats] = useState([]);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState(null);
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    async function getAuthStatus() {
      try {
        const res = await fetch(BASE_URL + '/api/me', {
          credentials: 'include',
        });

        if (!res.ok) {
          console.log(res);
          console.log('ERRO@');
          return;
        }

        // if (res.status === 401) {
        //   console.log('Not authenticated');

        //   return;
        // }

        const data = await res.json();
        console.log('DATA:', data);

        setIsAuthenticated(true);
        setUser(data);
      } catch (error) {
        console.log('Error!', error);
      }
    }

    async function pingServer() {
      try {
        const res = await fetch(BASE_URL + '/ping');

        if (!res.ok) {
          console.error('Error pinging server');
          return;
        }

        console.log('💿 Server is online!');
      } catch (error) {
        console.log('Error!', error);
      }
    }

    pingServer();
    getAuthStatus();
  }, []);

  useEffect(() => {
    async function getChats() {
      try {
        const res = await fetch(BASE_URL + '/api/chats', {
          credentials: 'include',
        });

        if (!res.ok) {
          console.log(res);
          console.log('ERRO@');
          return;
        }

        const data = await res.json();
        console.log('🍑 Chats:', data);

        setChats(data);
      } catch (error) {
        console.log('Error!', error);
      }
    }

    getChats();
  }, [isAuthenticated]);

  const openAuthModal = (mode) => {
    setAuthMode(mode);
    setAuthForm({ name: '', email: '', password: '' });
  };

  const closeAuthModal = () => setAuthMode(null);

  const handleAuthChange = (event) => {
    const { name, value } = event.target;

    setAuthForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  async function handleLogout() {
    try {
      const response = await fetch(BASE_URL + '/api/logout', {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Auth error');

      setIsAuthenticated(false);
      setChatId('new');
      setMessages([]);
      setChats([]);
      console.log('Auth success');
    } catch (err) {
      // setError(true);
      console.error(err);
    } finally {
    }
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();

    const payload =
      authMode === 'signup'
        ? { ...authForm, guestSessionId }
        : {
            email: authForm.email,
            password: authForm.password,
            guestSessionId,
          };

    const url =
      authMode === 'signup'
        ? BASE_URL + '/api/register'
        : BASE_URL + '/api/login';

    console.log(`${authMode} payload:`, payload);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Auth error');
      }

      setIsAuthenticated(true);
      closeAuthModal();
      // console.log('Auth success');
    } catch (err) {
      // setError(true);
      console.error(err);
    } finally {
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    const inputValue = inputRef.current?.value.trim();
    if (!inputValue || isPending) return;

    setIsPending(true);
    setError(false);

    setMessages((prev) => [
      ...prev,
      {
        role: 'user',
        content: inputValue,
        timestamp: new Date().toJSON(),
      },
    ]);

    try {
      const payload = {
        conversationId: chatId,
        model: 'openai/gpt-oss-120b',
        message: inputValue,
      };

      const response = await fetch(BASE_URL + '/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        console.log('ERROR', data);

        throw new Error('Failed to send message');
      }

      const data = await response.json();

      setMessages((prev) => [...prev, data]);

      if (chatId === 'new') setChatId(data?.conversationId);

      if (chatId === 'new' && isAuthenticated) {
        const newConversation = { _id: data._id, title: data.title };
        const oldConversations = [...chats];
        oldConversations.unshift(newConversation);
        setChats(oldConversations);
      }

      inputRef.current.value = '';
    } catch (err) {
      setError(true);
      console.error(err);
    } finally {
      setIsPending(false);
    }
  };

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

  async function handleChat(id: string) {
    closeMenu();

    // console.log('Chat id', id);
    setChatId(id);

    try {
      const response = await fetch(`${BASE_URL}/api/chats/${id}/messages`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        console.log('ERROR', data);

        throw new Error('Failed to send message');
      }

      const data = await response.json();
      console.log('🔥 Chat history:', data);

      setMessages(data);
    } catch (err) {
      // setError(true);
      console.error(err);
    } finally {
      // setIsPending(false);
    }
  }

  function handleCancel() {
    console.log('Cancelling...');
  }

  console.log('Messages', messages);

  const [isInputEmpty, setIsInputEmpty] = useState(true);

  const styles = {
    backdrop: {
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      zIndex: 1000,
    },
    modal: {
      position: 'relative',
      width: '100%',
      maxWidth: '420px',
      backgroundColor: '#171717',
      color: '#f5f5f5',
      padding: '32px',
      borderRadius: '16px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      boxSizing: 'border-box',
    },
    closeButton: {
      position: 'absolute',
      top: '12px',
      right: '14px',
      border: 'none',
      background: 'transparent',
      color: '#aaa',
      fontSize: '26px',
      cursor: 'pointer',
    },
    field: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      marginBottom: '18px',
    },
    label: {
      fontSize: '14px',
      color: '#d4d4d4',
    },
    input: {
      width: '100%',
      padding: '12px 14px',
      boxSizing: 'border-box',
      borderRadius: '8px',
      border: '1px solid #404040',
      backgroundColor: '#262626',
      color: '#fff',
      fontSize: '15px',
      outline: 'none',
    },
    submitButton: {
      width: '100%',
      padding: '13px',
      marginTop: '6px',
      border: 'none',
      borderRadius: '8px',
      backgroundColor: '#fff',
      color: '#171717',
      fontSize: '16px',
      fontWeight: 600,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    switchText: {
      marginTop: '22px',
      textAlign: 'center',
      fontSize: '14px',
      color: '#a3a3a3',
    },
    switchButton: {
      border: 'none',
      background: 'none',
      color: '#fff',
      textDecoration: 'underline',
      cursor: 'pointer',
      fontSize: '14px',
    },
  };

  ////////////////////////////////////////////////////////! HAMBURGER CODE
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  function closeMenu() {
    setIsOpen(false);
  }

  function handleMobilLogin() {
    closeMenu();
    openAuthModal('login');
  }

  function handleMobileNewChat() {
    closeMenu();
    handleNewChat();
  }

  ////////////////////////////////////////////////////////! HAMBURGER CODE
  const [pinnedChats, setPinnedChats] = useState([]);

  async function handleTogglePin(item) {
    try {
      const response = await fetch(`${BASE_URL}/api/chats/${item._id}/pin`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to pin conversation');
      }

      const data = await response.json();

      console.log(data);

      if (data.pinned) {
        setChats((prev) => {
          return prev.filter((i) => i._id !== item._id);
        });

        setPinnedChats((prev) => {
          return [...prev, item];
        });
      } else {
        setPinnedChats((prev) => {
          return prev.filter((i) => i._id !== item._id);
        });

        setChats((prev) => {
          return [...prev, item];
        });
      }

      // console.log(item);

      // setChats((prev) => {
      //   return prev.filter((i) => i._id !== item._id);
      // });

      // setPinnedChats((prev) => {
      //   return [...prev, item];
      // });
    } catch (err) {
      // setError(true);
      console.error(err);
    } finally {
      // setIsPending(false);
    }
  }

  function handleMoreOptions() {
    console.log('Showing more options');
  }

  //////////////////////////////////////////////////////! RENAME MODAL

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [currentRenameId, setCurrentRenameId] = useState('');

  async function handleSave() {
    console.log({ title, currentRenameId });

    try {
      // console.log(chatId);
      // console.log(
      //   `${BASE_URL}/api/chats/${chatId}?guestSessionId=${guestSessionId}`,
      // );

      const response = await fetch(
        `${BASE_URL}/api/chats/${currentRenameId}/rename`,
        {
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({
            title,
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to renaming conversation');
      }

      setChats((prev) => {
        return prev.map((i) => {
          if (i._id === currentRenameId) return { ...i, title };
          return i;
        });
      });

      setTitle('');
      setCurrentRenameId('');

      handleCloseRenameModal();
    } catch (err) {
      // setError(true);
      console.error(err);
    } finally {
      // setIsPending(false);
    }
  }

  function handleOpenRenameModal(chatId1: string, title1: string) {
    console.log({ title: title1, currentRenameId: chatId1 });

    setTitle(title1);
    setCurrentRenameId(chatId1);
    setShowModal(true);
  }

  function handleCloseRenameModal() {
    console.log('Modal closed!');

    setShowModal(false);
  }

  //////////////////////////////////////////////////////! SIDEBAR BUTTONS
  async function handleDeleteChat(chatId: string) {
    try {
      // console.log(chatId);
      // console.log(
      //   `${BASE_URL}/api/chats/${chatId}?guestSessionId=${guestSessionId}`,
      // );

      const response = await fetch(`${BASE_URL}/api/chats/${chatId}/`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        // const data = await response.json();
        // console.log('ERROR DELETEING CONVERSATION', data);
        throw new Error('Failed to delete conversation');
      }

      setChats((prev) => {
        return prev.filter((i) => i._id !== chatId);
      });
    } catch (err) {
      // setError(true);
      console.error(err);
    } finally {
      // setIsPending(false);
    }
  }

  ///?! PINED

  async function fetchPinnedChats() {
    try {
      // console.log(chatId);
      // console.log(
      //   `${BASE_URL}/api/chats/${chatId}?guestSessionId=${guestSessionId}`,
      // );

      const response = await fetch(`${BASE_URL}/api/chats/pinned`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to getting pinned conversation');
      }

      const data = await response.json();
      setPinnedChats(data);
    } catch (err) {
      // setError(true);
      console.error(err);
    } finally {
      // setIsPending(false);
    }
  }

  useEffect(() => {
    fetchPinnedChats();
  }, []);

  const [sidebar, setSidebar] = useState('expand');

  function handleToggleSidebar() {
    console.log('Expanding/collapsing sidebar...');
  }

  function handleExpandidebar() {
    setSidebar('expand');
  }

  function handleCollapseSidebar() {
    setSidebar('collapse');
  }

  function handleSearch() {
    console.log('Searching...');
  }

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
          if (i.role === 'assistant' && i._id === id) {
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
      const sortedMessages = messages.sort((a, b) =>
        a._id.localeCompare(b._id),
      );

      // console.log(sortedMessages);

      // return;

      const currentMessageIndex = sortedMessages.findIndex((i) => i._id === id);
      const previousMessage = sortedMessages[currentMessageIndex - 1];
      console.log('Previous message:', previousMessage);

      // return;

      const response = await fetch(
        `${BASE_URL}/api/messages/${previousMessage._id}/regenerate`,
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

  return (
    <>
      {/* SIDEBAR */}
      {sidebar === 'expand' && (
        <header className="sidebar">
          <div className="sidebar-header">
            <a href="/" className="logo">
              Kivo
            </a>
            <div className="sidebar-header__group">
              <button onClick={handleSearch} className="sidebar-btn">
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
              <button onClick={handleCollapseSidebar} className="sidebar-btn">
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
          </div>

          <div className="sidebar-row-2">
            <button onClick={handleNewChat} className="sidebar-btn">
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
          </div>

          {pinnedChats.length > 0 && isAuthenticated && (
            <div className="sidebar-row sidebar-row-3">
              <p>Pinned</p>

              {pinnedChats.map((c) => {
                return (
                  <div
                    key={c._id}
                    // onClick={() => handleChat(c._id)}
                    onKeyDown={(e) => {
                      // Only handle keyboard events on the parent itself
                      if (e.target !== e.currentTarget) return;

                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleChat(c._id);
                      }
                    }}
                    // onKeyDown={(e) => {
                    //   if (e.key === 'Enter' || e.key === ' ') {
                    //     e.preventDefault();
                    //     handleChat(c._id);
                    //   }
                    // }}
                    className={
                      chatId === c._id
                        ? 'sidebar-btn2 selected'
                        : 'sidebar-btn2'
                    }
                  >
                    <button
                      type="button"
                      className="sidebar-chat-title"
                      onClick={() => handleChat(c._id)}
                    >
                      {c.title}
                    </button>
                    {/* {c.title} */}

                    <div className="sidebar-btn-group">
                      <ChatPopover
                        // isPinned={c.isPinned}
                        onRename={() => handleOpenRenameModal(c._id, c.title)}
                        onPin={() => handleTogglePin(c._id)}
                        onDelete={() => handleDeleteChat(c._id)}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePin(c);
                        }}
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
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {chats.length > 0 && isAuthenticated && (
            <div className="sidebar-row sidebar-row-3">
              <p>Recent</p>

              {chats.map((c) => {
                return (
                  <div
                    key={c._id}
                    // onClick={() => handleChat(c._id)}
                    onKeyDown={(e) => {
                      // Only handle keyboard events on the parent itself
                      if (e.target !== e.currentTarget) return;

                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleChat(c._id);
                      }
                    }}
                    // onKeyDown={(e) => {
                    //   if (e.key === 'Enter' || e.key === ' ') {
                    //     e.preventDefault();
                    //     handleChat(c._id);
                    //   }
                    // }}
                    className={
                      chatId === c._id
                        ? 'sidebar-btn2 selected'
                        : 'sidebar-btn2'
                    }
                  >
                    <button
                      type="button"
                      className="sidebar-chat-title"
                      onClick={() => handleChat(c._id)}
                    >
                      {c.title}
                    </button>
                    {/* {c.title} */}

                    <div className="sidebar-btn-group">
                      {/* <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePin();
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        height="24px"
                        viewBox="0 -960 960 960"
                        width="24px"
                        fill="#1f1f1f"
                      >
                        <path d="M240-400q-33 0-56.5-23.5T160-480q0-33 23.5-56.5T240-560q33 0 56.5 23.5T320-480q0 33-23.5 56.5T240-400Zm240 0q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm240 0q-33 0-56.5-23.5T640-480q0-33 23.5-56.5T720-560q33 0 56.5 23.5T800-480q0 33-23.5 56.5T720-400Z" />
                      </svg>
                    </button> */}
                      <ChatPopover
                        // isPinned={c.isPinned}
                        onRename={() => handleOpenRenameModal(c._id, c.title)}
                        onPin={() => handleTogglePin(c)}
                        onDelete={() => handleDeleteChat(c._id)}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePin(c);
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          height="24px"
                          viewBox="0 -960 960 960"
                          width="24px"
                          fill="#1f1f1f"
                        >
                          <path d="M640-760v280l68 68q6 6 9 13.5t3 15.5v23q0 17-11.5 28.5T680-320H520v234q0 17-11.5 28.5T480-46q-17 0-28.5-11.5T440-86v-234H280q-17 0-28.5-11.5T240-360v-23q0-8 3-15.5t9-13.5l68-68v-280q-17 0-28.5-11.5T280-800q0-17 11.5-28.5T320-840h320q17 0 28.5 11.5T680-800q0 17-11.5 28.5T640-760ZM354-400h252l-46-46v-314H400v314l-46 46Zm126 0Z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {isAuthenticated && (
            <div className="sidebar-row sidebar-row-4">
              <button onClick={handleLogout} className="sidebar-btn2">
                Logout
              </button>
            </div>
          )}
        </header>
      )}
      {/* //! ****************** SIDEBAR COLLAPSED *******************/}
      {sidebar === 'collapse' && (
        <header className="collapsed-sidebar">
          <div>
            <button onClick={handleExpandidebar} className="sidebar-btn">
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

          <div>
            <button onClick={handleNewChat} className="sidebar-btn">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 -960 960 960"
                width="24px"
                fill="#1f1f1f"
              >
                <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h357l-80 80H200v560h560v-278l80-80v358q0 33-23.5 56.5T760-120H200Zm280-360ZM360-360v-170l367-367q12-12 27-18t30-6q16 0 30.5 6t26.5 18l56 57q11 12 17 26.5t6 29.5q0 15-5.5 29.5T897-728L530-360H360Zm481-424-56-56 56 56ZM440-440h56l232-232-28-28-29-28-231 231v57Zm260-260-29-28 29 28 28 28-28-28Z" />
              </svg>
            </button>
            <button onClick={handleSearch} className="sidebar-btn">
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
          </div>

          {isAuthenticated && (
            <div className="sidebar-row sidebar-row-4">
              <button onClick={handleLogout} className="sidebar-btn2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="24px"
                  viewBox="0 -960 960 960"
                  width="24px"
                  fill="#1f1f1f"
                >
                  <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h357l-80 80H200v560h560v-278l80-80v358q0 33-23.5 56.5T760-120H200Zm280-360ZM360-360v-170l367-367q12-12 27-18t30-6q16 0 30.5 6t26.5 18l56 57q11 12 17 26.5t6 29.5q0 15-5.5 29.5T897-728L530-360H360Zm481-424-56-56 56 56ZM440-440h56l232-232-28-28-29-28-231 231v57Zm260-260-29-28 29 28 28 28-28-28Z" />
                </svg>
              </button>
            </div>
          )}
        </header>
      )}
      {/* //! ****************** MOBILE NAV *******************/}
      <>
        {isOpen && (
          <div className="hm-backdrop" onMouseDown={closeMenu}>
            <aside
              className="hm-drawer"
              id="hm-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Main menu"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="hm-drawer__content">
                <header className="hm-header">
                  <a className="logo" href="#home" onClick={closeMenu}>
                    Kivo
                  </a>
                </header>

                {chats.length > 0 && isAuthenticated ? (
                  <div className="sidebar-mobile sidebar-row sidebar-row-3">
                    <p>Recent</p>
                    {chats.map((c) => {
                      return (
                        <button
                          key={c._id}
                          onClick={() => handleChat(c._id)}
                          className={
                            chatId === c._id
                              ? 'sidebar-btn2 selected'
                              : 'sidebar-btn2'
                          }
                        >
                          {c.title}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <section className="hm-login-prompt">
                    <h2>Make Kivo more personal</h2>
                    <p>
                      Log in to save your chats and get answers based on saved
                      chats.
                    </p>
                    <a
                      className="hm-login-button"
                      href="#login"
                      onClick={handleMobilLogin}
                    >
                      Log in
                    </a>
                  </section>
                )}

                {isAuthenticated && (
                  <section className="waakye">
                    <div className="sidebar-row sidebar-row-4">
                      <button onClick={handleLogout} className="sidebar-btn2">
                        Logout
                      </button>
                    </div>
                  </section>
                )}
              </div>

              <footer className="hm-footer">
                <button
                  className="hm-chat-button"
                  type="button"
                  onClick={handleMobileNewChat}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="24px"
                    viewBox="0 -960 960 960"
                    width="24px"
                    fill="#1f1f1f"
                  >
                    <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h357l-80 80H200v560h560v-278l80-80v358q0 33-23.5 56.5T760-120H200Zm280-360ZM360-360v-170l367-367q12-12 27-18t30-6q16 0 30.5 6t26.5 18l56 57q11 12 17 26.5t6 29.5q0 15-5.5 29.5T897-728L530-360H360Zm481-424-56-56 56 56ZM440-440h56l232-232-28-28-29-28-231 231v57Zm260-260-29-28 29 28 28 28-28-28Z" />
                  </svg>
                  New Chat
                </button>
              </footer>
            </aside>
          </div>
        )}
      </>
      {/* //! ****************** RENAME MODAL *******************/}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 1000,
          }}
          onClick={handleCloseRenameModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rename-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 400,
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: 24,
              boxSizing: 'border-box',
              boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
            }}
          >
            <h2
              id="rename-title"
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: '#111827',
                margin: '0 0 8px',
              }}
            >
              Rename title
            </h2>

            <p
              style={{
                fontSize: 14,
                color: '#6b7280',
                margin: '0 0 20px',
                lineHeight: 1.5,
              }}
            >
              Enter a new title for this conversation.
            </p>

            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                // if (e.key === 'Escape') onClose?.();
              }}
              placeholder="Enter title"
              maxLength={100}
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: 15,
                color: '#111827',
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: 10,
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: 24,
              }}
            />

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={handleCloseRenameModal}
                style={{
                  padding: '10px 18px',
                  border: '1px solid #d1d5db',
                  borderRadius: 10,
                  backgroundColor: '#ffffff',
                  color: '#374151',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={!title.trim()}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: 10,
                  backgroundColor: title.trim() ? '#111827' : '#9ca3af',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: title.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {/* //! **************** MAIN CHAT *****************/}
      <main className={messages.length === 0 ? 'chat empty' : 'chat'}>
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
                  onClick={() => openAuthModal('signup')}
                  className="btn-base btn-outline"
                >
                  Sign up
                </button>
                <button
                  onClick={() => openAuthModal('login')}
                  className="btn-base btn-solid"
                >
                  Login
                </button>
              </div>
            </>
          )}
        </nav>
        {/* //! **************** CHAT CONTAINER *****************/}
        <div className="chat-container">
          {messages.map((message, index) => {
            if (message.role === 'user') {
              return (
                <div key={index} className="sender-msg-wrapper">
                  <div className="sender-bubble">
                    <p>{message.content}</p>
                  </div>
                  <div className="sender-msg-btn-group">
                    <button
                      onClick={() => handleCopy(message.text)}
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
                      onClick={() => rateMessage(message._id, 'up')}
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
                      onClick={() => rateMessage(message._id, 'down')}
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
                      onClick={() => handleRegenerateMessage(message._id)}
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
              <button onClick={handleSubmit}>Retry</button>
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

          <form className="input-wrapper" onSubmit={handleSubmit}>
            <input
              type="text"
              id="chat"
              className="input"
              placeholder="Ask KivoAI"
              ref={inputRef}
              onChange={(e) => setIsInputEmpty(e.target.value.trim() === '')}
            />

            {isPending ? (
              <button
                className="btn-send"
                disabled={isPending}
                onClick={handleCancel}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="24px"
                  viewBox="0 -960 960 960"
                  width="24px"
                  fill="#1f1f1f"
                >
                  <path d="M240-320v-320q0-33 23.5-56.5T320-720h320q33 0 56.5 23.5T720-640v320q0 33-23.5 56.5T640-240H320q-33 0-56.5-23.5T240-320Z" />
                </svg>
              </button>
            ) : (
              <button
                className={isInputEmpty ? 'btn-send send-disbled' : 'btn-send'}
                type="submit"
                disabled={isPending || isInputEmpty}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="24px"
                  viewBox="0 -960 960 960"
                  width="24px"
                  fill="#1f1f1f"
                >
                  <path d="M440-647 244-451q-12 12-28 11.5T188-452q-11-12-11.5-28t11.5-28l264-264q6-6 13-8.5t15-2.5q8 0 15 2.5t13 8.5l264 264q11 11 11 27.5T772-452q-12 12-28.5 12T715-452L520-647v447q0 17-11.5 28.5T480-160q-17 0-28.5-11.5T440-200v-447Z" />
                </svg>
              </button>
            )}
          </form>
        </div>
      </main>
      {/* CLEAR MODAL */}
      {showClearModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '400px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: '#111827',
                margin: '0 0 12px',
              }}
            >
              Clearing chat?
            </h2>

            <p
              style={{
                fontSize: '14px',
                lineHeight: 1.6,
                color: '#6b7280',
                margin: '0 0 24px',
              }}
            >
              Are you sure you want to clear this chat? This action cannot be
              undone.
            </p>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
              }}
            >
              <button
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#fff',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
                onClick={handleCancelClearChat}
                type="button"
              >
                Cancel
              </button>

              <button
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                onClick={handleClearChat}
                type="button"
              >
                Yes, clear chat
              </button>
            </div>
          </div>
        </div>
      )}
      {/* AUTH MODAL */}
      {authMode && (
        <div
          style={styles.backdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeAuthModal();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
            style={styles.modal}
          >
            <button
              type="button"
              onClick={closeAuthModal}
              aria-label="Close modal"
              style={styles.closeButton}
            >
              &times;
            </button>

            <h2
              id="auth-title"
              style={{
                margin: '0 0 8px',
                fontSize: '26px',
              }}
            >
              {authMode === 'signup' ? 'Create an account' : 'Welcome back'}
            </h2>

            <p style={{ color: '#a3a3a3', marginBottom: '28px' }}>
              {authMode === 'signup'
                ? 'Sign up to get started with Kivo AI.'
                : 'Log in to continue to Kivo AI.'}
            </p>

            <form onSubmit={handleAuthSubmit}>
              {authMode === 'signup' && (
                <div style={styles.field}>
                  <label htmlFor="auth-name" style={styles.label}>
                    Name
                  </label>
                  <input
                    id="auth-name"
                    name="name"
                    type="text"
                    placeholder="Your name"
                    autoComplete="name"
                    value={authForm.name}
                    onChange={handleAuthChange}
                    style={styles.input}
                    required
                  />
                </div>
              )}

              <div style={styles.field}>
                <label htmlFor="auth-email" style={styles.label}>
                  Email
                </label>
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={authForm.email}
                  onChange={handleAuthChange}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.field}>
                <label htmlFor="auth-password" style={styles.label}>
                  Password
                </label>
                <input
                  id="auth-password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  autoComplete={
                    authMode === 'signup' ? 'new-password' : 'current-password'
                  }
                  value={authForm.password}
                  onChange={handleAuthChange}
                  style={styles.input}
                  required
                  // minLength={8}
                />
              </div>

              <button type="submit" style={styles.submitButton}>
                {authMode === 'signup' ? 'Create account' : 'Log in'}
              </button>
            </form>

            <p style={styles.switchText}>
              {authMode === 'signup'
                ? 'Already have an account? '
                : "Don't have an account? "}

              <button
                type="button"
                style={styles.switchButton}
                onClick={() =>
                  openAuthModal(authMode === 'signup' ? 'login' : 'signup')
                }
              >
                {authMode === 'signup' ? 'Log in' : 'Sign up'}
              </button>
            </p>
          </section>
        </div>
      )}
    </>
  );
}

export default App;
