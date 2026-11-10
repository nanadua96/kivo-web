'use client';

import { useEffect, useState } from 'react';
import styles from './DeleteConversationModal.module.css';

type Props = {
  title: string;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export function DeleteConversationModal({
  title,
  isPending,
  onClose,
  onConfirm,
}: Props) {
  const [error, setError] = useState('');

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isPending) onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isPending, onClose]);

  async function confirmDelete() {
    setError('');
    try {
      await onConfirm();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Could not delete this conversation. Please try again.',
      );
    }
  }

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) onClose();
      }}
    >
      <section
        className={styles.modal}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-conversation-title"
        aria-describedby="delete-conversation-description"
      >
        <h2 id="delete-conversation-title">Delete conversation?</h2>
        <p id="delete-conversation-description">
          This will permanently delete <strong>{title}</strong>. You can’t undo
          this action.
        </p>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.deleteButton}
            onClick={() => void confirmDelete()}
            disabled={isPending}
          >
            {isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </section>
    </div>
  );
}
