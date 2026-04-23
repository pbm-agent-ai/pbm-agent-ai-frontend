import type { ComponentType } from 'react';

export type MonitoringPlatform = 'naver' | 'coupang' | '11st' | 'gmarket' | 'auction' | 'naver-flights' | 'naver_flight' | '';

export type MonitoringStatus = 'exploring' | 'met' | 'waiting' | 'completed';

// [추가] 대시보드에서만 쓰는 카드/드래프트 타입을 분리해 any 의존을 제거한다.
export interface DashboardMonitoringItem {
  conditionId?: number;
  status: MonitoringStatus;
  statusLabel?: string;
  statusColor?: string;
  product: string;
  platform: MonitoringPlatform;
  currentPrice: string;
  targetPrice: string;
}

export interface DashboardStat {
  label: string;
  value: string;
  color: string;
  icon: ComponentType<{ className?: string }>;
}

// [추가] 핵심 지표 카드에 필요한 요약 수치다.
export interface DashboardStatsSummary {
  monitoringCount: number;
  completedPaymentCount: number;
  waitingCount: number;
  totalSavingsAmount: number;
}

export interface DashboardConditionDetailResponse {
  conditionId?: number;
  product: string;
  platform: MonitoringPlatform;
  currentPrice: string;
  targetPrice: string;
  status: MonitoringStatus;
  statusLabel?: string;
  statusColor?: string;
}

export interface DashboardParsedConditionChip {
  label: string;
  value: string;
  color?: string;
}

export interface DashboardCommandParsedData {
  platform?: MonitoringPlatform | string;
  route?: string; //항공권 같은 경우는 route를 따로 놔둘 것인가
  maxPrice?: number;
  mode?: 'AUTO_PAYMENT' | 'ALERT_ONLY';
  productName?: string;
  options?: string;
}

export interface DashboardCommandExecuteData {
  commandId: number;
  status: string;
  parsedData: DashboardCommandParsedData;
  missingFields: string[];
}

export interface DashboardMonitoringCreateResponse {
  success: boolean;
  data: DashboardCommandExecuteData;
  message: string;
}

export interface DashboardMonitoringCreateRequest {
  commandId: number;
  productName: string;
  platform: MonitoringPlatform;
  route?: string;
  productDetail: string;
  targetPrice: string;
  monitoringRegisteredAt: string;
  paymentMode: 'ALERT_ONLY' | 'AUTO_PAYMENT';
  expiryDate: string;
}

// [추가] 대시보드 모니터링 목록 API 응답의 기본 형태다.
export interface DashboardMonitoringResponseItem extends DashboardMonitoringItem {
  statusMessage?: string;
  detailLabel?: string;
}
