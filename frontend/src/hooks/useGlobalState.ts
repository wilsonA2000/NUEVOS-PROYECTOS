import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GlobalState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  vibrationEnabled: boolean;
  setVibrationEnabled: (enabled: boolean) => void;
  lastSync: string | null;
  setLastSync: (date: string | null) => void;
  resetState: () => void;
}

const initialState = {
  sidebarOpen: true,
  notificationsEnabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
  lastSync: null,
};

export const useGlobalState = create<GlobalState>()(
  persist(
    (set) => ({
      ...initialState,

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setNotificationsEnabled: (enabled) =>
        set({ notificationsEnabled: enabled }),

      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),

      setVibrationEnabled: (enabled) => set({ vibrationEnabled: enabled }),

      setLastSync: (date) => set({ lastSync: date }),

      resetState: () => set(initialState),
    }),
    {
      name: 'global-state',
    }
  )
); 