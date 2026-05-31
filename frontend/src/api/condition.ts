import shoppingApiClient from './shoppingAxios';
import type { ConditionListResponse, SubscriptionDeleteResponse, SubscriptionListResponse, SubscriptionUpdateRequest, SubscriptionUpdateResponse } from '../types/condition';

type ConditionListQueryParams = {
  keyword?: string;
  mode?: 'AUTO_PAYMENT' | 'ALERT_ONLY';
  platform?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
};

// 가격히스토리 조회 API 추후 삭제 or 변경?
export async function fetchConditionList(
  params?: ConditionListQueryParams,
): Promise<ConditionListResponse> {
  const { data } = await shoppingApiClient.get<ConditionListResponse>('/api/conditions', {
    params,
  });
  return data;
}

// 구독 리스트 조회 API 8083포트로 변경
export async function fetchSubscriptions(): Promise<SubscriptionListResponse> {
  const { data } = await shoppingApiClient.get<SubscriptionListResponse>('/api/v1/monitoring/subscriptions');
  return data;
}

export async function updateSubscription(
  id: number,
  payload: SubscriptionUpdateRequest,
): Promise<SubscriptionUpdateResponse> {
  const { data } = await shoppingApiClient.patch<SubscriptionUpdateResponse>(
    `/api/v1/monitoring/subscriptions/${id}`,
    payload,
  );
  return data;
}

export async function deleteSubscription(id: number): Promise<SubscriptionDeleteResponse> {
  const { data } = await shoppingApiClient.delete<SubscriptionDeleteResponse>(
    `/api/v1/monitoring/subscriptions/${id}`,
  );
  return data;
}
