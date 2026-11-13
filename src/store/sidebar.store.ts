import { create } from "zustand";

type SidebarState = {
  expanded: boolean;
  toggleSidebar: () => void;
};

export const useSidebar = create<SidebarState>((set) => ({
  expanded: true,

  toggleSidebar: () => set((state) => ({ expanded: !state.expanded })),
}));
