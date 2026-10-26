import { useState, useRef, useEffect } from 'react';
import './ChatPopover.css';

export function ChatPopover({ onRename, onPin, onDelete, isPinned = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  function handleAction(action) {
    setIsOpen(false);
    action?.();
  }

  return (
    <div className="chat-popover" ref={popoverRef}>
      <button
        type="button"
        className="chat-popover-trigger"
        aria-label="Chat options"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>

      {isOpen && (
        <div className="chat-popover-menu" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => handleAction(onRename)}
          >
            Rename
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => handleAction(onPin)}
          >
            {isPinned ? 'Unpin' : 'Pin'}
          </button>

          <div className="chat-popover-divider" />

          <button
            type="button"
            role="menuitem"
            className="chat-popover-delete"
            onClick={() => handleAction(onDelete)}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
