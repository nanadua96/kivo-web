import { create } from 'zustand';

type SidebarState = {
  expanded: boolean;
  toggleSidebar: () => void;

  showAuthModal: boolean;
  toggleAuthModal: () => void;
};

export const useSidebar = create<SidebarState>((set) => ({
  expanded: true,
  showAuthModal: false,

  toggleSidebar: () => set((state) => ({ expanded: !state.expanded })),

  toggleAuthModal: () =>
    set((state) => ({ showAuthModal: !state.showAuthModal })),
}));
