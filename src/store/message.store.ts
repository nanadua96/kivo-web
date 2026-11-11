import { create } from "zustand";
import type { Message, Messages } from "@/types/message.types";

type MessagesState = {
  messages: Messages;

  addMessage: (message: Message) => void;
  addMessages: (messages: Messages) => void;
  updateMessage: (id: string, content: string) => void;
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
      const old = [...state.messages];

      return old.map((m) => {
        if (m.id === id) return { ...m, content };
        return m;
      });
    }),

  clearMessages: () => set(() => ({ messages: [] })),
}));
