import shoppingApiClient from './shoppingAxios';
import { createApiClient } from './apiClientFactory';
import { fetchMyPayments } from './payments';
import type {
  DashboardClarificationSubmissionRequest,
  DashboardClarificationSubmissionResponse,
  DashboardCommandDetailResponse,
  DashboardCommandParseRequest,
  DashboardCommandParseResponse,
  DashboardCommandSelectionRequest,
  DashboardCommandSelectionResponse,
  DashboardStatsSummary,
} from '../types/dashboard';

// monitoring/payment 서비스에서 집계한 대시보드 통계를 만들기 위한 클라이언트
const monitoringApiClient = createApiClient({ baseURL: import.meta.env.VITE_API_BASE_URL ?? '' });

interface MonitoringSubItem {
  id: number;
  status: string;
  snapshotPrice?: number | null;
  targetPrice?: number | null;
}
interface MonitoringListApiResponse {
  success: boolean;
  data: MonitoringSubItem[];
}

/**
 * 대시보드 핵심 지표 요약을 반환한다.
 * 단일 집계 API가 없으므로 monitoring + payment API를 병렬 호출해 프론트에서 합산한다.
 */
export async function fetchDashboardStatsSummary(): Promise<DashboardStatsSummary> {
  const [monitoringRes, payments] = await Promise.allSettled([
    monitoringApiClient.get<MonitoringListApiResponse>('/api/v1/monitoring/subscriptions'),
    fetchMyPayments(),
  ]);

  const subs: MonitoringSubItem[] =
    monitoringRes.status === 'fulfilled' ? (monitoringRes.value.data?.data ?? []) : [];

  const paymentList =
    payments.status === 'fulfilled' ? payments.value : [];

  const activeCount = subs.filter((s) => s.status === 'ACTIVE').length;
  const triggeredCount = subs.filter((s) => s.status === 'TRIGGERED').length;
  const completedPaymentCount = paymentList.filter((p) => p.status === 'SUCCESS').length;
  const totalSavingsAmount = paymentList
    .filter((p) => p.status === 'SUCCESS')
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);

  return {
    monitoringCount: activeCount,
    completedPaymentCount,
    waitingCount: triggeredCount,
    totalSavingsAmount,
  };
}

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
