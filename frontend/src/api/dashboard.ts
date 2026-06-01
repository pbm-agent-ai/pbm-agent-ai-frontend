import apiClient from './axios';
import commandApiClient from './CommandAxios';
import type {
  DashboardClarificationSubmissionRequest,
  DashboardClarificationSubmissionResponse,
  DashboardCommandDetailResponse,
  DashboardCommandParseRequest,
  DashboardCommandParseResponse,
  DashboardCommandProductLinksRequest,
  DashboardCommandSelectionRequest,
  DashboardCommandSelectionResponse,
  DashboardStatsSummary,
} from '../types/dashboard';

// [추가] 대시보드 관련 API 호출을 한 곳에 모아둔 서비스 레이어다.

export async function fetchDashboardStatsSummary(): Promise<DashboardStatsSummary> {
  const { data } = await apiClient.get<
    | DashboardStatsSummary
    | {
        data?: DashboardStatsSummary | {
          monitoringCount?: number;
          completedPaymentCount?: number;
          waitingCount?: number;
          totalSavingsAmount?: number;
        };
        monitoringCount?: number;
        completedPaymentCount?: number;
        waitingCount?: number;
        totalSavingsAmount?: number;
      }
  >('/api/stats/summary');

  const normalize = (value: unknown): DashboardStatsSummary | null => {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const summary = value as {
      monitoringCount?: number;
      completedPaymentCount?: number;
      waitingCount?: number;
      totalSavingsAmount?: number;
    };

    return {
      monitoringCount: Number(summary.monitoringCount ?? 0),
      completedPaymentCount: Number(summary.completedPaymentCount ?? 0),
      waitingCount: Number(summary.waitingCount ?? 0),
      totalSavingsAmount: Number(summary.totalSavingsAmount ?? 0),
    };
  };

  if (typeof data === 'object' && data !== null && 'data' in data) {
    const nested = normalize((data as { data?: unknown }).data);
    if (nested) {
      return nested;
    }
  }

  const direct = normalize(data);
  if (direct) {
    return direct;
  }

  return {
    monitoringCount: 0,
    completedPaymentCount: 0,
    waitingCount: 0,
    totalSavingsAmount: 0,
  };
}

// 2026-05-19 수정: 명령 파싱 전용 엔드포인트를 Dashboard에서 재사용할 수 있게 분리한다.
export async function parseDashboardCommand(
  payload: DashboardCommandParseRequest,
): Promise<DashboardCommandParseResponse> {
  const { data } = await commandApiClient.post<DashboardCommandParseResponse>('/api/v1/commands/parse', payload);
  return data;
}

export async function submitDashboardClarification(
  commandId: string,
  payload: DashboardClarificationSubmissionRequest,
): Promise<DashboardClarificationSubmissionResponse> {
  const { data } = await commandApiClient.post<DashboardClarificationSubmissionResponse>(
    `/api/v1/commands/${commandId}/clarifications`,
    payload,
  );
  return data;
}

// 2026-05-20 수정: 명령 세션 조회 (상품 후보 목록)
export async function fetchCommandDetail(
  commandId: string,
): Promise<DashboardCommandDetailResponse> {
  const { data } = await commandApiClient.get<DashboardCommandDetailResponse>(
    `/api/v1/commands/${commandId}`,
  );
  return data;
}

// 2026-05-20 수정: 상품 URL 제출
export async function submitCommandProductLinks(
  commandId: string,
  payload: DashboardCommandProductLinksRequest,
): Promise<DashboardCommandDetailResponse> {
  const { data } = await commandApiClient.post<DashboardCommandDetailResponse>(
    `/api/v1/commands/${commandId}/product-links`,
    payload,
  );
  return data;
}

// 2026-05-20 수정: 상품 선택 전송
export async function submitCommandSelection(
  commandId: string,
  payload: DashboardCommandSelectionRequest,
): Promise<DashboardCommandSelectionResponse> {
  const { data } = await commandApiClient.post<DashboardCommandSelectionResponse>(
    `/api/v1/commands/${commandId}/selection`,
    payload,
  );
  return data;
}
