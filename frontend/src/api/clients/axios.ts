import { createApiClient } from './apiClientFactory.ts';

const apiClient = createApiClient({
  baseURL: import.meta.env.VITE_API_BASE_URL as string,
});

export default apiClient;
