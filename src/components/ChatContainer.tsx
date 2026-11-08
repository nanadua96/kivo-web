'use client';

import styles from './ChatContainer.module.css';
import ChatMain from './ChatMain';
import ChatSidebar from './ChatSidebar';

export function ChatContainer() {
  return (
    <div className={styles.container}>
      <ChatSidebar className={styles.sidebar} />
      <ChatMain className={styles.chat} />
    </div>
  );
}
