import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  tokenType: string | null;
  authErrorMessage: string | null;
  /** 인증된 사용자 ID (auth/me 응답에서 설정) */
  userId: number | null;
  setAccessToken: (token: string | null, tokenType?: string | null) => void;
  setAuthErrorMessage: (message: string | null) => void;
  setUserId: (userId: number | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      tokenType: null,
      authErrorMessage: null,
      userId: null,

      setAccessToken: (token, tokenType = null) => {
        set({ accessToken: token, tokenType });
      },

      setAuthErrorMessage: (message) => {
        set({ authErrorMessage: message });
      },

      setUserId: (userId) => {
        set({ userId });
      },

      logout: () => {
        set({ accessToken: null, tokenType: null, userId: null });
      },
    }),
    {
      name: 'pbm-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        tokenType: state.tokenType,
        userId: state.userId,
      }),
    },
  ),
);
