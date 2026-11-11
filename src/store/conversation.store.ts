// import { create } from "zustand";

// type MessageState = {
//   messages: [];
//   initMessages: (messages: []) => void;
//   addMessage: (newMessage: []) => void;
// };

// export const useMessage = create<MessageState>((set) => ({
//   expanded: true,
//   showAuthModal: false,

//   messages: [],

//   initMessages: (messages) => set({ messages }),

//   addMessage: (newMessage) =>
//     set((state) => ({ messages: [...state.messages, newMessage] })),

//   toggleSidebar: () => set((state) => ({ expanded: !state.expanded })),

//   toggleAuthModal: () =>
//     set((state) => ({ showAuthModal: !state.showAuthModal })),
// }));

// import { create } from "zustand";
// import type { Message, Messages } from "@/types/message.types";

// type SidebarState = {
//   messages: Messages;
//   initMessages: (messages: Messages) => void;
//   addMessage: (newMessage: Message) => void;
//   clearMessages: () => void;
// };

// export const useSidebar = create<SidebarState>((set) => ({
//   messages: [],

//   initMessages: (messages) => set({ messages }),

//   addMessage: (newMessage) =>
//     set((state) => ({ messages: [...state.messages, newMessage] })),

//   clearMessages: () => set(() => ({ messages: [] })),
// }));
