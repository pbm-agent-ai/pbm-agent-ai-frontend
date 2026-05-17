import { create } from 'zustand';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  tokenType: string | null;
  authErrorMessage: string | null;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null, tokenType?: string | null) => void;
  setAuthErrorMessage: (message: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  tokenType: null,
  authErrorMessage: null,

  setUser: (user) => set({ user }),

  setAccessToken: (token, tokenType = null) => {
    // 2026-04-30 수정: accessToken과 tokenType을 브라우저 메모리(Zustand) 안에서 함께 관리해 Authorization 헤더를 서버 응답 스펙대로 구성한다.
    // localStorage/sessionStorage에는 저장하지 않아 새로고침 시 자동 유지는 하지 않는다.
    set({ accessToken: token, tokenType });
  },

  setAuthErrorMessage: (message) => {
    // 2026-04-30 수정: 재발급 실패 등 인증 공통 오류 메시지를 로그인 화면으로 전달하기 위해 메모리에 저장한다.
    set({ authErrorMessage: message });
  },

  logout: () => {
    // 2026-04-30 수정: 로그아웃 시 메모리의 사용자 정보와 accessToken/tokenType을 비우고 인증 오류 메시지는 필요 시 별도로 유지한다.
    set({ user: null, accessToken: null, tokenType: null });
  },
}));
