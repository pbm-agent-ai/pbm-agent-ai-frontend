import { createApiClient } from './apiClientFactory.ts';

const shoppingApiClient = createApiClient({
  baseURL: import.meta.env.VITE_SHOPPING_API_BASE_URL as string,
});

export default shoppingApiClient;