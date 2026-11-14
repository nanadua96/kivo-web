"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./ChatPopover.css";
import { Edit2, MoreH, Pen, PinTack, Trash5 } from "reicon-react";

type Props = {
  onRename?: () => void;
  onPin?: () => void;
  onDelete?: () => void;
  isPinned?: boolean;
};

type MenuPosition = {
  top: number;
  left: number;
};

export function ChatPopover({
  onRename,
  onPin,
  onDelete,
  isPinned = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isOpen) return;

    function updatePosition() {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;

      const triggerRect = trigger.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const gap = 4;
      const viewportPadding = 8;
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      const desiredTop =
        spaceBelow >= menuRect.height + gap || spaceBelow >= triggerRect.top
          ? triggerRect.bottom + gap
          : triggerRect.top - menuRect.height - gap;
      const maxTop = Math.max(
        viewportPadding,
        window.innerHeight - menuRect.height - viewportPadding,
      );
      const top = Math.min(Math.max(viewportPadding, desiredTop), maxTop);
      const maxLeft = Math.max(
        viewportPadding,
        window.innerWidth - menuRect.width - viewportPadding,
      );
      const left = Math.min(
        Math.max(viewportPadding, triggerRect.left),
        maxLeft,
      );

      setMenuPosition({ top, left });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        popoverRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const conversationItem = popoverRef.current?.closest(
      "[data-conversation-item]",
    );
    const menu = menuRef.current;
    if (!conversationItem || !menu) return;

    function handlePointerLeave(event: Event, otherRegion: Element) {
      if (!(event instanceof PointerEvent)) return;
      if (event.pointerType === "touch") return;
      const relatedTarget = event.relatedTarget;
      if (
        relatedTarget instanceof Node &&
        otherRegion.contains(relatedTarget)
      ) {
        return;
      }
      setIsOpen(false);
    }

    const handleItemLeave = (event: Event) => handlePointerLeave(event, menu);

    const handleMenuLeave = (event: Event) =>
      handlePointerLeave(event, conversationItem);

    conversationItem.addEventListener("pointerleave", handleItemLeave);
    menu.addEventListener("pointerleave", handleMenuLeave);

    return () => {
      conversationItem.removeEventListener("pointerleave", handleItemLeave);
      menu.removeEventListener("pointerleave", handleMenuLeave);
    };
  }, [isOpen]);

  function handleAction(action?: () => void) {
    setIsOpen(false);
    action?.();
  }

  return (
    <div
      className={`chat-popover${isPinned ? " chat-popover--pinned" : ""}`}
      ref={popoverRef}
    >
      {/* Button */}
      <button
        ref={triggerRef}
        type="button"
        className="chat-popover-trigger"
        aria-label="Chat options"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => {
          setMenuPosition(null);
          setIsOpen((prev) => !prev);
        }}
      >
        <MoreH weight="Filled" />
      </button>
      {/* Menu */}
      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            className="chat-popover-menu"
            role="menu"
            style={{
              top: menuPosition?.top ?? 0,
              left: menuPosition?.left ?? 0,
              visibility: menuPosition ? "visible" : "hidden",
            }}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction(onRename)}
            >
              <Pen />
              <span>Rename</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction(onPin)}
            >
              <span>
                <PinTack />
                {/* {isPinned ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    height="24px"
                    width="24px"
                    fill="#1f1f1f"
                  >
                    <path d="M14,5H10V7.18L7.25,4.42Q7.13,4.3 7.06,4.15T7,3.85Q7,3.52 7.23,3.26T7.83,3H16q0.43,0 0.71,0.29T17,4q0,0.4-0.36,0.56Q16.28,4.72 16,5v6q0,0.42-0.29,0.71T15,12t-0.71-0.29Q14,11.43 14,11V5ZM11,22V16H7.4q-0.63,0-1-0.44T6.03,14.58q0-0.28 0.11-0.55T6.5,13.5L8,12V10.85L2.1,4.9Q1.83,4.63 1.81,4.21T2.1,3.5Q2.38,3.22 2.8,3.22T3.5,3.5L20.48,20.48q0.3,0.3 0.29,0.71T20.45,21.9q-0.3,0.28-0.7,0.29t-0.7-0.29L13.15,16H13v6q0,0.43-0.29,0.71T12,23t-0.71-0.29Q11,22.43 11,22ZM8.85,14h2.3l-1.1-1.1L10,12.85L8.85,14ZM12,9.17ZM10.05,12.9Z" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    height="24px"
                    width="24px"
                    fill="#1f1f1f"
                  >
                    <path d="M16,5v7l1.7,1.7q0.15,0.15 0.23,0.34T18,14.43V15q0,0.42-0.29,0.71T17,16H13v5.85q0,0.42-0.29,0.71T12,22.85t-0.71-0.29T11,21.85V16H7q-0.42,0-0.71-0.29T6,15V14.43q0-0.2 0.08-0.39T6.3,13.7L8,12V5Q7.58,5 7.29,4.71T7,4Q7,3.57 7.29,3.29T8,3h8q0.43,0 0.71,0.29T17,4q0,0.42-0.29,0.71T16,5ZM8.85,14h6.3L14,12.85V5H10v7.85L8.85,14ZM12,14Z" />
                  </svg>
                )} */}
              </span>

              <span>{isPinned ? "Unpin" : "Pin"}</span>
            </button>

            <button
              type="button"
              role="menuitem"
              className="chat-popover-delete"
              onClick={() => handleAction(onDelete)}
            >
              <Trash5 size={24} />
              <span>Delete</span>
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
