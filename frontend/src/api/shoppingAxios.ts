import { createApiClient } from './apiClientFactory.ts';

const shoppingApiClient = createApiClient({
  // 쇼핑/조건 API는 기본적으로 8082 포트를 사용하고, 환경변수가 있으면 그 값을 우선한다.
  baseURL: import.meta.env.VITE_SHOPPING_API_BASE_URL
});

export default shoppingApiClient;