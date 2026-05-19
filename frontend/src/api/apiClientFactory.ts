import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '../store/authStore';

interface RefreshTokenResponse {
  success: true;
  data: {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
  };
  message: string;
}

interface RefreshTokenErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    detail: unknown;
  };
}

type CreateApiClientOptions = {
  baseURL: string;
  refreshBaseURL?: string;
  refreshPath?: string;
};

export const createApiClient = ({
  baseURL,
  refreshBaseURL = import.meta.env.VITE_AUTH_API_BASE_URL,
  refreshPath = '/api/v1/auth/refresh',
}: CreateApiClientOptions): AxiosInstance => {
  const apiClient = axios.create({
    baseURL,
    withCredentials: true,
  });

  apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
      // 2026-04-30 수정: 요청마다 현재 메모리에 저장된 accessToken과 tokenType을 읽어서 Authorization 헤더를 서버 응답 스펙대로 붙인다.
      const token = useAuthStore.getState().accessToken;
      const tokenType = useAuthStore.getState().tokenType ?? 'Bearer';

      config.headers.set('Content-Type', 'application/json');

      if (token) {
        config.headers.set('Authorization', `${tokenType} ${token}`);
      }

      return config;
    },
    (error: unknown) => Promise.reject(error),
  );

  apiClient.interceptors.response.use(
    (response: AxiosResponse): AxiosResponse => response,
    async (error: unknown) => {
      if (!axios.isAxiosError(error)) {
        return Promise.reject(error);
      }

      const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
      const requestUrl = originalRequest.url ?? '';
      // 2026-04-30 수정: 로그인/재발급 요청 자체는 401이어도 토큰 재발급 로직에 개입시키지 않는다.
      const shouldSkipRefresh =
        requestUrl.includes('/api/v1/auth/login') ||
        requestUrl.includes('/api/v1/auth/logout') ||
        requestUrl.includes(refreshPath);

      if (error.response?.status === 401 && !originalRequest._retry && !shouldSkipRefresh) {
        originalRequest._retry = true;

        try {
          // 2026-04-30 수정: refreshToken은 HttpOnly Cookie로 자동 전송되므로 body 없이 8081 인증 서버에 재발급 요청만 보낸다.
          const { data } = await axios.post<RefreshTokenResponse>(
            `${refreshBaseURL}${refreshPath}`,
            {},
            {
              withCredentials: true,
              headers: {
                'Content-Type': 'application/json',
              },
            },
          );

          const { accessToken: newToken, refreshToken, tokenType, expiresIn } = data.data;
          // 2026-04-30 수정: 재발급 응답의 tokenType까지 함께 메모리에 반영해 이후 Authorization 헤더가 서버 응답과 일치하도록 유지한다.
          void refreshToken;
          void expiresIn;
          useAuthStore.getState().setAccessToken(newToken, tokenType);

          if (originalRequest.headers) {
            (originalRequest.headers as Record<string, string>)['Authorization'] = `${tokenType} ${newToken}`;
          } else {
            originalRequest.headers = { Authorization: `${tokenType} ${newToken}` };
          }

          return apiClient(originalRequest);
        } catch (refreshError: unknown) {
          // 2026-04-30 수정: 재발급이 AUTH005/AUTH006으로 실패하면 서버 메시지를 저장한 뒤 로그인 화면으로 보내 재인증을 유도한다.
          if (axios.isAxiosError<RefreshTokenErrorResponse>(refreshError)) {
            const refreshErrorMessage = refreshError.response?.data?.error.message;
            useAuthStore.getState().setAuthErrorMessage(refreshErrorMessage ?? '세션이 만료되었습니다. 다시 로그인해주세요');
          } else {
            useAuthStore.getState().setAuthErrorMessage('세션이 만료되었습니다. 다시 로그인해주세요');
          }

          // refresh도 실패하면 인증이 끊긴 상태이므로 메모리 값을 비우고 로그인으로 돌린다.
          useAuthStore.getState().logout();
          window.location.href = '/login';
          return Promise.reject(error);
        }
      }

      return Promise.reject(error);
    },
  );

  return apiClient;
};
