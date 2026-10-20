import { useRef, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

import 'highlight.js/styles/github-dark.css';
import './App.css';

const BASE_URL = import.meta.env.VITE_API_URL;

console.log(BASE_URL);

function App() {
  const inputRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(false);

  const [chatId, setChatId] = useState('new');
  const [chats, setChats] = useState([]);

  // Authentication modal state
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
        const res = await fetch(BASE_URL + '/me', {
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

  const closeAuthModal = () => {
    setAuthMode(null);
  };

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

    // Add your signup/login fetch call here.
    const payload =
      authMode === 'signup'
        ? authForm
        : {
            email: authForm.email,
            password: authForm.password,
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
      console.log('Auth success');
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
        text: inputValue,
        timestamp: new Date().toJSON(),
      },
    ]);

    try {
      const payload = {
        chatId,
        model: 'gemini-3.5-flash-lite',
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

      if (chatId === 'new') {
        setChatId(data._id);
        setChats((prev) => [...prev, { _id: data._id, title: data.title }]);
      }

      inputRef.current.value = '';
    } catch (err) {
      setError(true);
      console.error(err);
    } finally {
      setIsPending(false);
    }
  };

  async function handleNewChat() {
    setChatId('new');
    setMessages([]);
  }

  async function handleChat(id: string) {
    console.log('Chat id', id);
    setChatId(id);

    try {
      const response = await fetch(`${BASE_URL}/api/chats/${id}`, {
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
      fontSize: '15px',
      fontWeight: 600,
      cursor: 'pointer',
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

  return (
    <>
      {/* SIDEBAR */}
      <header className="sidebar">
        <div style={{ padding: '8px' }}>
          <p className="logo">Kivo</p>
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

        {chats.length > 0 && (
          <div className="sidebar-row sidebar-row-3">
            <p>Recent</p>
            {chats.map((c) => {
              return (
                <button
                  key={c._id}
                  onClick={() => handleChat(c._id)}
                  className="sidebar-btn2"
                >
                  {c.title}
                </button>
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

      {/* MAIN CHAT */}
      <main className={messages.length === 0 ? 'chat empty' : 'chat'}>
        <nav style={{ display: 'flex', gap: '10px' }}>
          {isAuthenticated ? (
            // <p>authed</p>
            <p style={{ color: 'white' }}>{user.name}</p>
          ) : (
            <>
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
            </>
          )}
        </nav>

        <div className="chat-container">
          {messages.map((message, index) => {
            if (message.role === 'user') {
              return (
                <div key={index} className="sender-bubble">
                  <p>{message.text}</p>
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
                    {message.text}
                  </ReactMarkdown>
                </div>
              );
            }

            return null;
          })}

          {error && (
            <p style={{ color: 'red' }}>
              Error sending message. Please try again.
            </p>
          )}

          {isPending && (
            <p style={{ alignSelf: 'flex-start' }}>Waiting for response...</p>
          )}
        </div>

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
