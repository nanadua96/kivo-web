import { create } from "zustand";
import type { Message, Messages } from "@/types/message.types";

type MessagesState = {
  messages: Messages;

  initMessages: (message: Messages) => void;
  addMessage: (message: Message) => void;
  addMessages: (messages: Messages) => void;
  replaceMessagesAfter: (
    id: string,
    content: string,
    nextMessage: Message,
  ) => boolean;
  updateMessage: (id: string, content: string) => void;
  appendMessageContent: (id: string, content: string) => void;
  clearMessages: () => void;
};

export const useMessages = create<MessagesState>((set) => ({
  messages: [],

  initMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  addMessages: (messages) =>
    set((state) => ({ messages: [...state.messages, ...messages] })),

  replaceMessagesAfter: (id, content, nextMessage) => {
    let replaced = false;
    set((state) => {
      const index = state.messages.findIndex((message) => message.id === id);
      if (index === -1) return state;

      replaced = true;
      const editedMessage = {
        ...state.messages[index],
        content,
        text: content,
      };

      return {
        messages: [
          ...state.messages.slice(0, index),
          editedMessage,
          nextMessage,
        ],
      };
    });
    return replaced;
  },

  updateMessage: (id, content) =>
    set((state) => {
      return {
        messages: state.messages.map((message) =>
          message.id === id ? { ...message, content, text: content } : message,
        ),
      };
    }),

  appendMessageContent: (id, content) =>
    set((state) => ({
      messages: state.messages.map((message) =>
        message.id === id
          ? {
              ...message,
              content: message.content + content,
              text: message.content + content,
            }
          : message,
      ),
    })),

  clearMessages: () => set(() => ({ messages: [] })),
}));
