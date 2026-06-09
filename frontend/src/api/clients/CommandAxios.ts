import { createApiClient } from './apiClientFactory.ts';

const commandApiClient = createApiClient({
  // 명령 API는 기본적으로 8082 포트를 사용하고, 환경변수가 있으면 그 값을 우선한다.
  baseURL: import.meta.env.VITE_COMMAND_API_BASE_URL
});

export default commandApiClient;