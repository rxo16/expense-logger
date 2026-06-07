import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Profile } from "@/types";

interface User {
  id: string;
  email: string;
}

interface AuthStore {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  // Actions
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      profile: null,
      loading: true,

      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setLoading: (loading) => set({ loading }),

      signOut: () => set({ user: null, profile: null }),
    }),
    {
      name: "auth-store",
      // Only persist user — profile is re-fetched on mount
      partialize: (state) => ({ user: state.user }),
    }
  )
);
