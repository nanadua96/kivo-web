import { create } from "zustand";
import type { Message, Messages } from "@/types/message.types";

type MessagesState = {
  messages: Messages;

  addMessage: (message: Message) => void;
  addMessages: (messages: Messages) => void;
  updateMessage: (id: string, content: string) => void;
  appendMessageContent: (id: string, content: string) => void;
  clearMessages: () => void;
};

export const useMessages = create<MessagesState>((set) => ({
  messages: [],

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  addMessages: (messages) =>
    set((state) => ({ messages: [...state.messages, ...messages] })),

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
