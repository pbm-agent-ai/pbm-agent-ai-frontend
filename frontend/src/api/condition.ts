import { createApiClient } from './clients/apiClientFactory';
import type {
  ConditionCardItem,
  ConditionCreateRequest,
  ConditionCreateResponse,
  ConditionDeleteResponse,
  ConditionDetailItem,
  ConditionListResponse,
  ConditionUpdateResponse,
  ConditionUpdateRequest,
} from '../types/condition';
import type { DashboardMonitoringResponseItem } from '../types/dashboard';

// ── monitoring API 클라이언트 (price-service 8083, Vite proxy 경유) ──────────

const monitoringApiClient = createApiClient({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
});

// ── 백엔드 응답 타입 (MonitoringSubscriptionResponse) ────────────────────────

interface MonitoringSubscriptionResponse {
  id: number;
  commandId: string;
  platform: string;
  productId: string;
  productUrl: string | null;
  snapshotTitle: string | null;
  snapshotPrice: number | null;
  snapshotImageUrl: string | null;
  searchKeyword: string | null;
  targetPrice: number | null;
  currency: string;
  intent: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'TRIGGERED' | 'CANCELLED';
  checkIntervalMinutes: number;
  lastCheckedAt: string | null;
  nextCheckAt: string | null;
  scheduledEndAt: string | null;
  createdAt: string;
}

interface MonitoringApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

function normalizeTitle(value?: string | null): string {
  if (!value) {
    return '';
  }

  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── 어댑터: MonitoringSubscriptionResponse → ConditionCardItem ───────────────

function toConditionCardItem(sub: MonitoringSubscriptionResponse): ConditionCardItem {
  return {
    conditionId: sub.id,
    commandId: undefined,
    platform: sub.platform,
    keyword: sub.searchKeyword ?? normalizeTitle(sub.snapshotTitle) ?? '',
    maxPrice: sub.targetPrice ?? 0,
    mode: sub.intent === 'AUTO_PURCHASE' ? 'AUTO_PAYMENT' : 'ALERT_ONLY',
    isActive: sub.status === 'ACTIVE',
    currentPrice: sub.snapshotPrice ?? undefined,
    imageUrl: sub.snapshotImageUrl ?? undefined,
    updatedAt: sub.createdAt,
  };
}

function toConditionDetailItem(sub: MonitoringSubscriptionResponse): ConditionDetailItem {
  return {
    platform: sub.platform,
    keyword: sub.searchKeyword ?? normalizeTitle(sub.snapshotTitle) ?? '',
    maxPrice: sub.targetPrice ?? 0,
    mode: sub.intent === 'AUTO_PURCHASE' ? 'AUTO_PAYMENT' : 'ALERT_ONLY',
    isActive: sub.status === 'ACTIVE',
    currentPrice: sub.snapshotPrice ?? undefined,
    imageUrl: sub.snapshotImageUrl ?? undefined,
    priceDiff: sub.snapshotPrice != null && sub.targetPrice != null
      ? sub.snapshotPrice - sub.targetPrice
      : undefined,
    currentExecutionCount: 0,
    lastCheckedAt: sub.lastCheckedAt ?? sub.createdAt,
    recentPrices: [],
    createdAt: sub.createdAt,
    updatedAt: sub.createdAt,
  };
}

// ── 공개 API 함수 ─────────────────────────────────────────────────────────────

/**
 * 대시보드 모니터링 목록 조회 (ACTIVE 구독 전체).
 */
export async function fetchDashboardMonitoringItems(): Promise<DashboardMonitoringResponseItem[]> {
  const { data } = await monitoringApiClient.get<MonitoringApiResponse<MonitoringSubscriptionResponse[]>>(
    '/api/v1/monitoring/subscriptions',
  );

  return (data.data ?? []).map((sub) => ({
    conditionId: sub.id,
    status: sub.status === 'TRIGGERED' ? 'met' : sub.status === 'ACTIVE' ? 'waiting' : 'completed',
    statusLabel: sub.status,
    product: normalizeTitle(sub.snapshotTitle) ?? sub.searchKeyword ?? '',
    platform: sub.platform,
    currentPrice: sub.snapshotPrice != null ? `₩${sub.snapshotPrice.toLocaleString()}` : '-',
    targetPrice: sub.targetPrice != null ? `₩${sub.targetPrice.toLocaleString()}` : '-',
  }));
}

/**
 * 조건 상세 조회.
 */
export async function fetchConditionDetail(conditionId: number): Promise<ConditionDetailItem> {
  const { data } = await monitoringApiClient.get<MonitoringApiResponse<MonitoringSubscriptionResponse>>(
    `/api/v1/monitoring/subscriptions/${conditionId}`,
  );
  return toConditionDetailItem(data.data);
}

/**
 * 조건 수정 (targetPrice, intent 변경).
 */
export async function updateConditionDetail(
  conditionId: number,
  payload: ConditionUpdateRequest,
): Promise<ConditionUpdateResponse> {
  // 백엔드 MonitoringSubscriptionUpdateRequest에 맞게 변환
  const backendPayload: { intent?: string; targetPrice?: number; scheduledEndAt?: string } = {};
  if (payload.mode != null) {
    backendPayload.intent = payload.mode === 'AUTO_PAYMENT' ? 'AUTO_PURCHASE' : 'PRICE_TRACK';
  }
  if (payload.maxPrice != null) {
    backendPayload.targetPrice = payload.maxPrice;
  }
  if (payload.expiredAt != null) {
    backendPayload.scheduledEndAt = payload.expiredAt;
  }

  const { data } = await monitoringApiClient.patch<MonitoringApiResponse<MonitoringSubscriptionResponse>>(
    `/api/v1/monitoring/subscriptions/${conditionId}`,
    backendPayload,
  );

  return {
    success: data.success,
    message: data.message,
    data: data.success ? toConditionCardItem(data.data) : undefined,
  };
}

/**
 * 조건 삭제 (구독 CANCELLED 처리).
 */
export async function deleteConditionDetail(conditionId: number): Promise<ConditionDeleteResponse> {
  await monitoringApiClient.delete(`/api/v1/monitoring/subscriptions/${conditionId}`);
  return { success: true, message: '모니터링 구독이 취소되었습니다.' };
}

/**
 * 조건 일시정지 → intent를 PRICE_TRACK(알림 전용)으로 변경.
 */
export async function pauseConditionDetail(conditionId: number): Promise<ConditionUpdateResponse> {
  const { data } = await monitoringApiClient.patch<MonitoringApiResponse<MonitoringSubscriptionResponse>>(
    `/api/v1/monitoring/subscriptions/${conditionId}`,
    { intent: 'PRICE_TRACK' },
  );
  return { success: data.success, message: data.message };
}

/**
 * 조건 재개 → intent를 AUTO_PURCHASE로 변경.
 */
export async function resumeConditionDetail(conditionId: number): Promise<ConditionUpdateResponse> {
  const { data } = await monitoringApiClient.patch<MonitoringApiResponse<MonitoringSubscriptionResponse>>(
    `/api/v1/monitoring/subscriptions/${conditionId}`,
    { intent: 'AUTO_PURCHASE' },
  );
  return { success: data.success, message: data.message };
}

/**
 * 조건 목록 조회 (페이지네이션 포함).
 */
export async function fetchConditionList(): Promise<ConditionListResponse> {
  const { data } = await monitoringApiClient.get<MonitoringApiResponse<MonitoringSubscriptionResponse[]>>(
    '/api/v1/monitoring/subscriptions',
  );

  const conditions = (data.data ?? []).map(toConditionCardItem);

  return {
    success: data.success,
    message: data.message,
    data: {
      totalElements: conditions.length,
      totalPages: 1,
      currentPage: 0,
      conditions,
    },
  };
}

/**
 * 조건 등록 - 현재는 command-service 흐름(AI 명령 파싱)을 통해 모니터링이 생성되므로
 * 직접 등록 API는 미지원. 미래 확장 대비용.
 */
export async function createConditionRegistration(
  _payload: ConditionCreateRequest,
): Promise<ConditionCreateResponse> {
  throw new Error('모니터링 구독은 AI 명령 파싱을 통해 자동 생성됩니다. 대시보드에서 명령을 입력해주세요.');
}

// ── 하위 호환 re-export (이전 shoppingAxios 의존 코드 대비) ──────────────────

/** @deprecated fetchConditionDetail 사용 */
export { fetchConditionDetail as getConditionDetail };

// ── 하위 호환: Conditions.tsx 등에서 쓰는 이전 함수명 ──────────

import type {
  SubscriptionItem,
  SubscriptionListResponse,
  SubscriptionUpdateRequest,
  SubscriptionUpdateResponse,
  SubscriptionDeleteResponse,
} from '../types/condition';

/**
 * @deprecated fetchConditionList() 사용. 이전 SubscriptionItem[] 형태로 반환.
 */
export async function fetchSubscriptions(): Promise<SubscriptionListResponse> {
  const { data } = await monitoringApiClient.get<MonitoringApiResponse<MonitoringSubscriptionResponse[]>>(
    '/api/v1/monitoring/subscriptions',
  );

  const items: SubscriptionItem[] = (data.data ?? []).map((sub) => ({
    id: sub.id,
    commandId: sub.commandId,
    platform: sub.platform,
    productId: sub.productId,
    productUrl: sub.productUrl ?? '',
    snapshotTitle: normalizeTitle(sub.snapshotTitle),
    snapshotPrice: sub.snapshotPrice ?? 0,
    snapshotImageUrl: sub.snapshotImageUrl ?? undefined,
    searchKeyword: sub.searchKeyword ?? '',
    targetPrice: sub.targetPrice ?? 0,
    currency: sub.currency,
    intent: sub.intent === 'AUTO_PURCHASE' ? 'AUTO_PAYMENT' : 'ALERT_ONLY',
    status: sub.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
    checkIntervalMinutes: sub.checkIntervalMinutes,
    lastCheckedAt: sub.lastCheckedAt ?? '',
    nextCheckAt: sub.nextCheckAt ?? '',
    scheduledEndAt: sub.scheduledEndAt ?? '',
    createdAt: sub.createdAt,
  }));

  return {
    success: data.success,
    data: items,
    message: data.message,
  };
}

/**
 * @deprecated updateConditionDetail() 사용. 이전 SubscriptionUpdateResponse 형태로 반환.
 */
export async function updateSubscription(
  id: number,
  payload: SubscriptionUpdateRequest,
): Promise<SubscriptionUpdateResponse> {
  const backendPayload: { intent?: string; targetPrice?: number; scheduledEndAt?: string } = {};
  if (payload.intent != null) {
    backendPayload.intent = payload.intent === 'AUTO_PAYMENT' ? 'AUTO_PURCHASE' : 'PRICE_TRACK';
  }
  if (payload.targetPrice != null) {
    backendPayload.targetPrice = payload.targetPrice;
  }
  if (payload.scheduledEndAt != null) {
    backendPayload.scheduledEndAt = payload.scheduledEndAt;
  }

  const { data } = await monitoringApiClient.patch<MonitoringApiResponse<MonitoringSubscriptionResponse>>(
    `/api/v1/monitoring/subscriptions/${id}`,
    backendPayload,
  );

  const sub = data.data;
  const item: SubscriptionItem = {
    id: sub.id,
    commandId: sub.commandId,
    platform: sub.platform,
    productId: sub.productId,
    productUrl: sub.productUrl ?? '',
    snapshotTitle: normalizeTitle(sub.snapshotTitle),
    snapshotPrice: sub.snapshotPrice ?? 0,
    snapshotImageUrl: sub.snapshotImageUrl ?? undefined,
    searchKeyword: sub.searchKeyword ?? '',
    targetPrice: sub.targetPrice ?? 0,
    currency: sub.currency,
    intent: sub.intent === 'AUTO_PURCHASE' ? 'AUTO_PAYMENT' : 'ALERT_ONLY',
    status: sub.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
    checkIntervalMinutes: sub.checkIntervalMinutes,
    lastCheckedAt: sub.lastCheckedAt ?? '',
    nextCheckAt: sub.nextCheckAt ?? '',
    scheduledEndAt: sub.scheduledEndAt ?? '',
    createdAt: sub.createdAt,
  };

  return {
    success: data.success,
    data: item,
    message: data.message,
  };
}

/**
 * @deprecated deleteConditionDetail() 사용.
 */
export async function deleteSubscription(id: number): Promise<SubscriptionDeleteResponse> {
  await monitoringApiClient.delete(`/api/v1/monitoring/subscriptions/${id}`);
  return { success: true, message: '모니터링 구독이 취소되었습니다.' };
}
