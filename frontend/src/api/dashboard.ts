import { createApiClient } from './clients/apiClientFactory';
import type {
  DashboardClarificationSubmissionRequest,
  DashboardClarificationSubmissionResponse,
  DashboardCommandDetailResponse,
  DashboardCommandParseRequest,
  DashboardCommandParseResponse,
  DashboardCommandSelectionRequest,
  DashboardCommandSelectionResponse,
} from '../types/dashboard';

// 쇼핑/명령 API (command-service 8082)
const shoppingApiClient = createApiClient({
  baseURL: import.meta.env.VITE_COMMAND_API_BASE_URL ?? '',
});

// 2026-05-19 수정: 명령 파싱 전용 엔드포인트를 Dashboard에서 재사용할 수 있게 분리한다.
export async function parseDashboardCommand(
  payload: DashboardCommandParseRequest,
): Promise<DashboardCommandParseResponse> {
  const { data } = await shoppingApiClient.post<DashboardCommandParseResponse>('/api/v1/commands/parse', payload);
  return data;
}

export async function submitDashboardClarification(
  commandId: string,
  payload: DashboardClarificationSubmissionRequest,
): Promise<DashboardClarificationSubmissionResponse> {
  const { data } = await shoppingApiClient.post<DashboardClarificationSubmissionResponse>(
    `/api/v1/commands/${commandId}/clarifications`,
    payload,
  );
  return data;
}

// 2026-05-20 수정: 명령 세션 조회 (상품 후보 목록)
// size=100: 멀티 플랫폼(NAVER+ALIEXPRESS 등) 전체 후보를 한 번에 수신하여 프론트에서 라운드로빈 정렬
export async function fetchCommandDetail(
  commandId: string,
  page = 0,
  size = 100,
): Promise<DashboardCommandDetailResponse> {
  const { data } = await shoppingApiClient.get<DashboardCommandDetailResponse>(
    `/api/v1/commands/${commandId}`,
    { params: { page, size } },
  );
  return data;
}
// 2026-05-20 수정: 상품 선택 전송
export async function submitCommandSelection(
  commandId: string,
  payload: DashboardCommandSelectionRequest,
): Promise<DashboardCommandSelectionResponse> {
  const { data } = await shoppingApiClient.post<DashboardCommandSelectionResponse>(
    `/api/v1/commands/${commandId}/selection`,
    payload,
  );
  return data;
}
