import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

interface RefreshTokenResponse {
  accessToken: string;
}

type CreateApiClientOptions = {
  baseURL: string;
  refreshBaseURL?: string;
  refreshPath?: string;
};

export const createApiClient = ({
  baseURL,
  refreshBaseURL = 'http://localhost:8081',
  refreshPath = '/api/auth/refresh',
}: CreateApiClientOptions): AxiosInstance => {
  const apiClient = axios.create({
    baseURL,
    withCredentials: true,
  });

  apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
      const token = sessionStorage.getItem('accessToken');
      const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;

      // FormData 요청은 브라우저가 multipart boundary를 자동으로 설정해야 하므로 Content-Type을 강제로 넣지 않는다.
      if (!isFormData) {
        config.headers.set('Content-Type', 'application/json');
      } else {
        config.headers.delete('Content-Type');
      }

      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
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

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const { data } = await axios.post<RefreshTokenResponse>(
            `${refreshBaseURL}${refreshPath}`,
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

  return apiClient;
};