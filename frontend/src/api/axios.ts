import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from 'axios';

interface RefreshTokenResponse {
  accessToken: string;
}

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string,
  withCredentials: true,
});

// 요청 인터셉터: sessionStorage에서 accessToken을 읽어 Authorization 헤더에 주입
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = sessionStorage.getItem('accessToken');
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  },
  (error: unknown) => Promise.reject(error),
);

// 응답 인터셉터: 401 발생 시 토큰 갱신 후 재시도, 실패 시 /login으로 이동
apiClient.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { data } = await axios.post<RefreshTokenResponse>(
          `${import.meta.env.VITE_API_BASE_URL as string}/api/auth/refresh`,
          {},
          { withCredentials: true },
        );

        const newToken = data.accessToken;
        sessionStorage.setItem('accessToken', newToken);

        if (originalRequest.headers) {
          (originalRequest.headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
        } else {
          originalRequest.headers = { Authorization: `Bearer ${newToken}` };
        }

        return apiClient(originalRequest);
      } catch {
        sessionStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
