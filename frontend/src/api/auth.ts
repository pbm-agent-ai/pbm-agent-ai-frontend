import { createApiClient } from './apiClientFactory';
import { useAuthStore } from '../store/authStore';
import type { User } from '@/types';

export const authApiClient = createApiClient({
  // 2026-05-18 수정 9: 인증 서버 기본 주소는 8081로 두고, 환경변수가 있으면 그 값을 우선 사용한다.
  baseURL: import.meta.env.VITE_AUTH_API_BASE_URL,
});

// 2026-05-18 수정 1: auth/me 성공 응답은 닉네임/이메일을 화면에 바로 쓰기 위해 서버 스펙 그대로 고정 타입으로 둔다.
export type AuthMeSuccessResponse = {
  success: true;
  data: {
    id: number;
    email: string;
    nickname: string;
    role: string;
  };
  message: string;
};

export type AuthMeErrorResponse = {
  success: false;
  data: null;
  message: string;
};

type AuthMeResponse = AuthMeSuccessResponse | AuthMeErrorResponse;

// 2026-05-18 수정 10: 비밀번호 변경은 auth 서버의 PATCH /api/v1/auth/password로만 처리하고 응답 메시지를 그대로 전달한다.
export type AuthPasswordSuccessResponse = {
  success: true;
  data: null;
  message: string;
};

export type AuthPasswordErrorResponse = {
  success: false;
  data: null;
  message: string;
};

type AuthPasswordResponse = AuthPasswordSuccessResponse | AuthPasswordErrorResponse;

// 2026-05-18 수정 16: 로그아웃은 auth 서버의 POST /api/v1/auth/logout로 처리하고 서버 message를 그대로 반환한다.
export type AuthLogoutSuccessResponse = {
  success: true;
  data: null;
  message: string;
};

export type AuthLogoutErrorResponse = {
  success: false;
  data: null;
  message: string;
};

type AuthLogoutResponse = AuthLogoutSuccessResponse | AuthLogoutErrorResponse;

// 2026-05-18 수정 4: Settings 계정탭은 8081 인증 서버의 /api/v1/auth/me만 호출해 현재 사용자 정보를 가져온다.
// 2026-05-18 수정 7: 조회 실패는 화면 에러 대신 null로 처리해 기존 UI 흐름을 방해하지 않는다.
export async function fetchAuthMe(): Promise<User | null> {
  try {
    const { data } = await authApiClient.get<AuthMeResponse>('/api/v1/auth/me');

    if (!data.success) {
      return null;
    }

    // 인증 성공 시 userId를 store에 저장해 다른 API에서 X-User-Id로 활용한다.
    useAuthStore.getState().setUserId(data.data.id);

    return {
      id: data.data.id,
      email: data.data.email,
      name: data.data.nickname,
    };
  } catch {
    return null;
  }
}

export async function changeAuthPassword(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<string> {
  const { data } = await authApiClient.patch<AuthPasswordResponse>('/api/v1/auth/password', payload);

  if (!data.success) {
    throw new Error(data.message);
  }

  return data.message;
}

export async function logoutAuth(): Promise<string> {
  const { data } = await authApiClient.post<AuthLogoutResponse>('/api/v1/auth/logout');

  if (!data.success) {
    throw new Error(data.message);
  }

  return data.message;
}

/** 확장 프로그램 연결용 pairing token을 발급한다. (단기 JWT, role=PAIRING) */
export async function fetchPairingToken(): Promise<string> {
  const { data } = await authApiClient.post<{
    success: boolean;
    data: { pairingToken: string };
    message: string;
  }>('/api/v1/auth/pairing-token');
  if (!data.success) throw new Error(data.message);
  return data.data.pairingToken;
}
