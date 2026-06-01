import { createApiClient } from './apiClientFactory.ts';

// 가격 API는 8083 포트에서 실행된다.
// 환경변수가 있으면 그 값을 우선한다.
const priceApiClient = createApiClient({
  baseURL: import.meta.env.VITE_PRICE_API_BASE_URL
});

export default priceApiClient;
