import shoppingApiClient from './shoppingAxios';
import type { DashboardMonitoringResponseItem } from '../types/dashboard';
import type {
  ConditionCreateRequest,
  ConditionCreateResponse,
  ConditionDeleteResponse,
  ConditionDetailItem,
  ConditionDetailResponse,
  ConditionListResponse,
  ConditionUpdateResponse,
  ConditionUpdateRequest,
} from '../types/condition';

// 조건 화면 전용 API 호출을 모아둔다.
// 목록 조회, 상세 조회, 등록은 모두 /api/conditions 계열 경로를 사용한다.

// 조건 목록 조회에서 사용할 수 있는 쿼리 파라미터만 따로 정의한다.
type ConditionListQueryParams = {
  keyword?: string;
  mode?: 'AUTO_PAYMENT' | 'ALERT_ONLY';
  platform?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
};

export async function fetchDashboardMonitoringItems(): Promise<DashboardMonitoringResponseItem[]> {
  const { data } = await shoppingApiClient.get<DashboardMonitoringResponseItem[]>('/api/conditions');
  return data;
}

export async function fetchConditionDetail(conditionId: number): Promise<ConditionDetailItem> {
  const { data } = await shoppingApiClient.get<ConditionDetailResponse>(`/api/conditions/${conditionId}`);
  return data.data;
}

export async function updateConditionDetail(
  conditionId: number,
  payload: ConditionUpdateRequest,
): Promise<ConditionUpdateResponse> {
  const { data } = await shoppingApiClient.put<ConditionUpdateResponse>(`/api/conditions/${conditionId}`, payload);
  return data;
}

export async function deleteConditionDetail(conditionId: number): Promise<ConditionDeleteResponse> {
  const { data } = await shoppingApiClient.delete<ConditionDeleteResponse>(`/api/conditions/${conditionId}`);
  return data;
}

export async function pauseConditionDetail(conditionId: number): Promise<ConditionUpdateResponse> {
  const { data } = await shoppingApiClient.patch<ConditionUpdateResponse>(`/api/conditions/${conditionId}/pause`);
  return data;
}

export async function resumeConditionDetail(conditionId: number): Promise<ConditionUpdateResponse> {
  const { data } = await shoppingApiClient.patch<ConditionUpdateResponse>(`/api/conditions/${conditionId}/resume`);
  return data;
}

// 조건 목록 화면은 목록 응답의 conditions 배열만 받아서 카드로 렌더링한다.
export async function fetchConditionList(
  params?: ConditionListQueryParams,
): Promise<ConditionListResponse> {
  const { data } = await shoppingApiClient.get<ConditionListResponse>('/api/conditions', {
    params,
  });
  return data;
}

export async function createConditionRegistration(
  payload: ConditionCreateRequest,
): Promise<ConditionCreateResponse> {
  const { data } = await shoppingApiClient.post<ConditionCreateResponse>('/api/conditions', payload);
  return data;
}
