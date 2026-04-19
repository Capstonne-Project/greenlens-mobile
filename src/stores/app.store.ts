import { create } from 'zustand';

interface AppState {
  isOnline:        boolean;
  globalLoading:   boolean;
  setOnline:       (v: boolean) => void;
  setGlobalLoading:(v: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isOnline:        true,
  globalLoading:   false,
  setOnline:       (v) => set({ isOnline: v }),
  setGlobalLoading:(v) => set({ globalLoading: v }),
}));
