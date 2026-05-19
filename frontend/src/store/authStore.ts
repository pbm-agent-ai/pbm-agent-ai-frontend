import { create } from 'zustand';

// 기존에 있던 user는 auth/me API의 응답이 닉네임과 이메일을 넘겨주기 때문에 더 이상 필요가 없어져 삭제한다.
// setUser도 마찬가지로 삭제한다. --- IGNORE ---
interface AuthState {
  accessToken: string | null;
  tokenType: string | null;
  authErrorMessage: string | null;
  setAccessToken: (token: string | null, tokenType?: string | null) => void;
  setAuthErrorMessage: (message: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  tokenType: null,
  authErrorMessage: null,

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
    // 2026-04-30 수정: 로그아웃 시 메모리의 accessToken/tokenType을 비우고 인증 오류 메시지는 필요 시 별도로 유지한다.
    set({ accessToken: null, tokenType: null });
  },
}));
