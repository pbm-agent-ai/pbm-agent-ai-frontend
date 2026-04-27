import { createApiClient } from './apiClientFactory.ts';

const imageSearchApiClient = createApiClient({
  baseURL: import.meta.env.VITE_IMAGE_SEARCH_API_BASE_URL as string,
});

export default imageSearchApiClient;