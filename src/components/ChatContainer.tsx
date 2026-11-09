'use client';

import { useSidebar } from '@/store';
import styles from './ChatContainer.module.css';
import ChatMain from './ChatMain';
import ChatSidebar from './ChatSidebar';

export function ChatContainer() {
  const expanded = useSidebar((state) => state.expanded);
  const toggleSidebar = useSidebar((state) => state.toggleSidebar);

  return (
    <div
      className={
        expanded ? styles.container : `${styles.container} ${styles.collapse}`
      }
    >
      <ChatSidebar className={styles.sidebar} />
      <ChatMain className={styles.chat} />
    </div>
  );
}
