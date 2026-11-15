"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./ChatPopover.css";
import { Edit2, MoreH, Pen, PinTack, Trash5 } from "reicon-react";
import { Delete, Edit, MoreHorizontalFilled, Pin, PinFilled } from "@/ui";

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
        <MoreHorizontalFilled />
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
              <Edit />
              <span>Rename</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction(onPin)}
            >
              <span>{isPinned ? <PinFilled /> : <Pin />}</span>
              <span>{isPinned ? "Unpin" : "Pin"}</span>
            </button>

            <button
              type="button"
              role="menuitem"
              className="chat-popover-delete"
              onClick={() => handleAction(onDelete)}
            >
              <Delete />
              <span>Delete</span>
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
