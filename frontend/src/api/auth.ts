import { createApiClient } from './apiClientFactory';
import type { User } from '@/types';

const authApiClient = createApiClient({
  // 2026-05-18 수정 9: 인증 서버 기본 주소는 8081로 두고, 환경변수가 있으면 그 값을 우선 사용한다.
  baseURL: import.meta.env.VITE_AUTH_API_BASE_URL ?? 'http://localhost:8081',
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

// 2026-05-18 수정 2: auth/me 실패 응답은 AUTH007 만료 케이스를 포함해 에러 코드/메시지 구조를 그대로 반영한다.
export type AuthMeErrorResponse = {
  success: false;
  error: {
    code?: string;
    message: string;
    detail: null;
  };
};

type AuthMeResponse = AuthMeSuccessResponse | AuthMeErrorResponse;

// 2026-05-18 수정 10: 비밀번호 변경은 auth 서버의 PATCH /api/v1/auth/password로만 처리하고 응답 메시지를 그대로 전달한다.
export type AuthPasswordSuccessResponse = {
  success: true;
  data: null;
  message: string;
};

// 2026-05-18 수정 11: 비밀번호 변경 실패 응답은 AUTH008 메시지를 그대로 노출할 수 있도록 서버 형식 그대로 둔다.
export type AuthPasswordErrorResponse = {
  success: false;
  error: {
    code?: string;
    message: string;
    detail: null;
  };
};

type AuthPasswordResponse = AuthPasswordSuccessResponse | AuthPasswordErrorResponse;

// 2026-05-18 수정 16: 로그아웃은 auth 서버의 POST /api/v1/auth/logout로 처리하고 서버 message를 그대로 반환한다.
export type AuthLogoutSuccessResponse = {
  success: true;
  data: null;
  message: string;
};

// 2026-05-18 수정 17: 로그아웃 실패 응답은 AUTH004 같은 인증 에러 메시지를 그대로 전달할 수 있게 서버 형식 그대로 둔다.
export type AuthLogoutErrorResponse = {
  success: false;
  error: {
    code?: string;
    message: string;
    detail: null;
  };
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
    throw new Error(data.error.message);
  }

  // 2026-05-18 수정 14: 비밀번호 변경 성공 문구도 서버 응답 message를 그대로 반환해 프론트 하드코딩을 없앤다.
  return data.message;
}

export async function logoutAuth(): Promise<string> {
  const { data } = await authApiClient.post<AuthLogoutResponse>('/api/v1/auth/logout');

  if (!data.success) {
    throw new Error(data.error.message);
  }

  return data.message;
}
