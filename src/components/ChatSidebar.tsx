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

import { init } from "@paralleldrive/cuid2";
import { createAuthClient } from "better-auth/client";
import { useEffect, useState } from "react";
import { useSidebar } from "@/store";
import AuthModal from "./AuthModal";
import { ChatPopover } from "./ChatPopover";
import styles from "./ChatSidebar.module.css";



const BASE_URL = "http://127.0.0.1:4000";

const createId = init({ length: 24 });

const authClient = createAuthClient();

type Props = {
  className?: string;
  expand?: boolean;
};

export default function ChatSidebar({ className, expand }: Props) {
  const [chatId, setChatId] = useState("new");
  const [chats, setChats] = useState([]);

  const [conversations, setConversations] = useState([]);

  const [isAuthenticated, setIsAuthenticated] = useState(false); //! GET FROM AUTH CLIENT
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

  // return <p>Hello world!</p>;

  useEffect(() => {
    async function getChats() {
      try {
        const res = await fetch(BASE_URL + "/api/v1/conversations", {
          credentials: "include",
        });

        if (!res.ok) {
          console.log("[/api/v1/conversations] error:");
          console.log(res);
          return;
        }

        const data = await res.json();
        console.log("🍑 Chats:", data);

        setChats(data);
      } catch (error) {
        console.log("Error!", error);
      }
    }

    getChats();
  }, [isAuthenticated]);

  async function handleLogout() {
    console.log("Signing out...");
    await authClient.signOut();
    setIsAuthenticated(false);
  }

  const [showClearModal, setShowClearModal] = useState(false);

  async function handleNewChat() {
    if (!isAuthenticated && messages.length) {
      setShowClearModal(true);
      return;
    }

    resetChat();
  }

  async function resetChat() {
    setChatId("new");
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
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) {
        // const data = await response.json();
        // console.log('ERROR DELETEING CONVERSATION', data);
        throw new Error("Failed to delete conversation");
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
      const response = await fetch(
        `${BASE_URL}/api/v1/conversations/${id}/messages`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        const data = await response.json();
        console.log("ERROR", data);

        throw new Error("Failed to send message");
      }

      const data = await response.json();
      console.log("🔥 Chat history:", data);

      setMessages(data);
    } catch (err) {
      // setError(true);
      console.error(err);
    } finally {
      // setIsPending(false);
    }
  }

  ////////////////////////////////////////////////////////! HAMBURGER CODE
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function closeMenu() {
    setIsOpen(false);
  }

  function handleMobilLogin() {
    closeMenu();
    openAuthModal("login");
  }

  function handleMobileNewChat() {
    closeMenu();
    handleNewChat();
  }

  ////////////////////////////////////////////////////////! HAMBURGER CODE
  const [pinnedChats, setPinnedChats] = useState([]);

  async function handleTogglePin(item) {
    try {
      const response = await fetch(`${BASE_URL}/api/chats/${item.id}/pin`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to pin conversation");
      }

      const data = await response.json();

      console.log(data);

      if (data.pinned) {
        setChats((prev) => {
          return prev.filter((i) => i.id !== item.id);
        });

        setPinnedChats((prev) => {
          return [...prev, item];
        });
      } else {
        setPinnedChats((prev) => {
          return prev.filter((i) => i.id !== item.id);
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
    console.log("Showing more options");
  }

  //////////////////////////////////////////////////////! RENAME MODAL

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [currentRenameId, setCurrentRenameId] = useState("");

  async function handleSave() {
    console.log({ title, currentRenameId });

    try {
      // console.log(chatId);
      // console.log(
      //   `${BASE_URL}/api/chats/${chatId}?guestSessionId=${guestSessionId}`,
      // );

      const response = await fetch(
        `${BASE_URL}/api/v1/conversations/${currentRenameId}/rename`,
        {
          method: "POST",
          credentials: "include",
          body: JSON.stringify({
            title,
          }),
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to renaming conversation");
      }

      setChats((prev) => {
        return prev.map((i) => {
          if (i.id === currentRenameId) return { ...i, title };
          return i;
        });
      });

      setTitle("");
      setCurrentRenameId("");

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
    console.log("Modal closed!");

    setShowModal(false);
  }

  //////////////////////////////////////////////////////! SIDEBAR BUTTONS
  async function handleDeleteChat(chatId: string) {
    try {
      // console.log(chatId);
      // console.log(
      //   `${BASE_URL}/api/chats/${chatId}?guestSessionId=${guestSessionId}`,
      // );

      const response = await fetch(
        `${BASE_URL}/api/v1/conversations/${chatId}/`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) {
        // const data = await response.json();
        // console.log('ERROR DELETEING CONVERSATION', data);
        throw new Error("Failed to delete conversation");
      }

      setChats((prev) => {
        return prev.filter((i) => i.id !== chatId);
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

      const response = await fetch(`${BASE_URL}/api/v1/conversations/pinned`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to getting pinned conversation");
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

  const [sidebar, setSidebar] = useState("expand");

  function handleToggleSidebar() {
    console.log("Expanding/collapsing sidebar...");
  }

  function handleExpandidebar() {
    setSidebar("expand");
  }

  function handleCollapseSidebar() {
    setSidebar("collapse");
  }

  function handleSearch() {
    console.log("Searching...");
  }

  const [showAuth, setShowAuth] = useState(false);

  const toggleAuthModal = () => setShowAuth(!showAuth);

  // const [sidebar, setSidebar] = useState('expand');

  // function handleToggleSidebar() {
  //   setSidebar((prev) => (prev === 'expand' ? 'collapse' : 'expand'));
  // }

  // function handleExpandSidebar() {
  //   setSidebar('expand');
  // }

  // function handleCollapseSidebar() {
  //   setSidebar('collapse');
  // }

  function generateList(limit: number) {
    const arr = [];

    for (let i = 1; i < limit + 1; i++) {
      arr.push({
        id: i,
        title: `Item ${i}`,
        pinned: false,
      });
    }

    return arr
  }


  const list = generateList(5);

  // console.log("🟢", list);
  


  // return <></>


  const expanded = useSidebar((state) => state.expanded);
  const toggleSidebar = useSidebar((state) => state.toggleSidebar);

  // console.log("Expanded:", expanded);

  return (
    <aside
      className={` ${styles.sidebar} ${expanded ? styles.expanded : styles.collapsed} ${className ?? ""}`}
      aria-hidden={!expanded}
      inert={!expanded}
    >
      {/* <aside className={className ?? ''}> */}
      <div className={styles.sidebarHeader}>
        <p className={styles.logo}>Kivo</p>
        <div className={styles.sidebarHeaderGroup}>
          <button
            type="button"
            onClick={handleSearch}
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
      </div>

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

      <div className="sidebar-row-2">
        <button
          onClick={handleNewChat}
          type="button"
          className={styles.newChatButton}
        >
          New chat
        </button>
      </div>

      {list.length > 0 && (
        <div className="sidebar-row sidebar-row-3">
          <p>Recents</p>

          {list.map((c) => {
            return (
              <div
                key={c.id}
                // onClick={() => handleChat(c._id)}
                onKeyDown={(e) => {
                  // Only handle keyboard events on the parent itself
                  if (e.target !== e.currentTarget) return;

                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleChat(c.id);
                  }
                }}
                // onKeyDown={(e) => {
                //   if (e.key === 'Enter' || e.key === ' ') {
                //     e.preventDefault();
                //     handleChat(c._id);
                //   }
                // }}
                className={styles.conversationItem}
                // className={
                //   chatId === c.id ? 'sidebar-btn2 selected' : 'sidebar-btn2'
                // }
              >
                <button
                  type="button"
                  className="sidebar-chat-title"
                  onClick={() => handleChat(c.id)}
                >
                  {c.title}
                </button>
                {/* {c.title} */}

                <div className={styles.conversationItemButtonGroup}>
                  <ChatPopover
                    isPinned={c.isPinned}
                    onRename={() => handleOpenRenameModal(c.id, c.title)}
                    onPin={() => handleTogglePin(c.id)}
                    onDelete={() => handleDeleteChat(c.id)}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePin(c);
                    }}
                    className={styles.conversationItemButton}
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

      <footer className="sidebar-row sidebar-row-4">
        <button
          type="button"
          style={{ display: "flex", alignItems: "center", gap: "16px" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "palegoldenrod",
              height: "32px",
              aspectRatio: 1,
              borderRadius: "999px",
            }}
          >
            <p>N</p>
          </div>
          <div>
            <p style={{ fontSize: "14px" }}>nanadua11@outlook.com</p>
          </div>
        </button>
      </footer>

      {/* //! ****************** MOBILE NAV *******************/}
      {/* {isOpen && (
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
      )} */}
    </aside>
  );
}
