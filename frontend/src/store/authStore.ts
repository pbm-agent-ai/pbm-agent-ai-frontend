import { create } from 'zustand';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,

  setUser: (user) => set({ user }),

  setAccessToken: (token) => {
    if (token) {
      sessionStorage.setItem('accessToken', token);
    } else {
      sessionStorage.removeItem('accessToken');
    }
    set({ accessToken: token });
  },

  logout: () => {
    sessionStorage.removeItem('accessToken');
    set({ user: null, accessToken: null });
  },
}));
