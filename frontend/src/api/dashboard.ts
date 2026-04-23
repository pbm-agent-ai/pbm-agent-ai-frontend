import apiClient from './axios';
import shoppingApiClient from './shoppingAxios';
import type {
  DashboardConditionDetailResponse,
  DashboardMonitoringCreateRequest,
  DashboardMonitoringCreateResponse,
  DashboardMonitoringResponseItem,
  DashboardStatsSummary,
} from '../types/dashboard';

// [추가] 대시보드 관련 API 호출을 한 곳에 모아두는 서비스 레이어다.
// [추가] 실제 백엔드 경로가 확정되면 이 파일만 수정하면 되도록 분리했다.

export async function fetchDashboardMonitoringItems(): Promise<DashboardMonitoringResponseItem[]> {
  // 대시보드 목록은 조건 전체를 받아 화면을 통째로 갱신하는 용도다.
  const { data } = await shoppingApiClient.get<DashboardMonitoringResponseItem[]>('/api/conditions');
  return data;
}

export async function fetchConditionDetail(conditionId: number): Promise<DashboardConditionDetailResponse> {
  // 카드 클릭 시에는 선택한 조건의 상세 정보만 다시 불러와 모달을 채운다.
  const { data } = await shoppingApiClient.get<DashboardConditionDetailResponse>(`/api/conditions/${conditionId}`);
  return data;
}

export async function fetchDashboardStatsSummary(): Promise<DashboardStatsSummary> {
  // TODO: 백엔드 stats summary 응답 필드가 확정되면 여기서 고정 매핑한다.
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

export async function createMonitoringCondition(commandText: string): Promise<DashboardMonitoringCreateResponse> {
  // 자연어 명령은 파싱하지 않고 텍스트 그대로 서버에 넘긴다.
  // 서버가 GPT 파싱 결과를 함께 주면 프론트는 그 값을 그대로 배지로 표시한다.
  const { data } = await shoppingApiClient.post<DashboardMonitoringCreateResponse>('/api/commands', {
    text: commandText,
  });
  return data;
}

export async function createDashboardMonitoringItem(
  payload: DashboardMonitoringCreateRequest,
): Promise<DashboardMonitoringCreateResponse> {
  const { data } = await shoppingApiClient.post<DashboardMonitoringCreateResponse>('/api/conditions', payload);
  return data;
}
