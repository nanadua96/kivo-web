'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api } from '@/lib/api';
import styles from './RenameConversationModal.module.css';

const renameSchema = z.object({
  title: z.string().trim().min(1, 'Enter a conversation name.').max(80),
});

type RenameValues = z.infer<typeof renameSchema>;

type Props = {
  currentTitle: string;
  isPending: boolean;
  onClose: () => void;
  onRename: (title: string) => Promise<void>;
};

export function RenameConversationModal({
  currentTitle,
  isPending,
  onClose,
  onRename,
}: Props) {
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RenameValues>({
    resolver: zodResolver(renameSchema),
    defaultValues: { title: currentTitle },
  });
  const title = watch('title');

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isPending) onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isPending, onClose]);

  async function submitRename(values: RenameValues) {
    try {
      await onRename(values.title);
    } catch (error) {
      setError('root', {
        message:
          error instanceof Error
            ? error.message
            : 'Could not rename this conversation. Please try again.',
      });
    }
  }

  const busy = isPending || isSubmitting;

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-conversation-title"
      >
        <h2 id="rename-conversation-title">Rename conversation</h2>
        <form onSubmit={handleSubmit(submitRename)}>
          <label className={styles.field}>
            <span>Name</span>
            <input
              {...register('title')}
              maxLength={80}
              autoFocus
              aria-invalid={Boolean(errors.title)}
              aria-describedby={
                errors.title ? 'rename-title-error' : 'rename-title-count'
              }
            />
            {errors.title && (
              <span id="rename-title-error" className={styles.error}>
                {errors.title.message}
              </span>
            )}
          </label>
          <div className={styles.formFooter}>
            <span id="rename-title-count" className={styles.count}>
              {title?.length ?? 0}/80
            </span>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={onClose}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={busy}
              >
                {busy ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
          {errors.root && (
            <p className={styles.error} role="alert">
              {errors.root.message}
            </p>
          )}
        </form>
      </section>
    </div>
  );
}
