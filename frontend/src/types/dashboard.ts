import type { ComponentType } from 'react';
import type { ConditionCardItem } from './condition.ts';



export type MonitoringStatus = 'exploring' | 'met' | 'waiting' | 'completed';

// [추가] 대시보드에서만 쓰는 카드/드래프트 타입을 분리해 any 의존을 제거한다.
export interface DashboardMonitoringItem {
  conditionId?: ConditionCardItem['conditionId'];
  status: MonitoringStatus;
  statusLabel?: string;
  statusColor?: string;
  product: string;
  platform: string;
  currentPrice: string;
  targetPrice: string;
}
//
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
  conditionId?: ConditionCardItem['conditionId'];
  product: string;
  platform: string;
  currentPrice: string;
  targetPrice: string;
  status: MonitoringStatus;
  statusLabel?: string;
  statusColor?: string;
}

export interface DashboardParsedCommand {
  // 2026-05-19 수정: 새 파싱 응답의 명령 필드만 보관한다.
  productCategory?: string;
  productName?: string;
  brand?: string;
  line?: string;
  model?: string;
  color?: string;
  size?: string;
  platform?: string;
  maxPrice?: number;
  minPrice?: number;
  currency?: string;
  route?: string;
  options?: string;
  mode?: 'ALERT_ONLY' | 'AUTO_PAYMENT';
}

export interface DashboardCommandParseSuccessData {
  // 2026-05-19 수정: parse 응답 메타를 화면 상태로 그대로 쓴다.
  intent: string;
  parsedData: DashboardParsedCommand;
  missingFields: string[];
  ambiguousFields: string[];
  needsClarification: boolean;
  confidence: number;
  commandId: number;
}

export interface DashboardCommandParseSuccessResponse {
  success: true;
  data: DashboardCommandParseSuccessData;
  message: string;
}

export interface DashboardCommandParseErrorResponse {
  // 2026-05-20 수정: 에러 응답은 message를 최상위 필드로 내려준다.
  success: false;
  data: null;
  message: string;
}

export type DashboardCommandParseResponse =
  | DashboardCommandParseSuccessResponse
  | DashboardCommandParseErrorResponse;

export type DashboardCommandParsedData = DashboardParsedCommand;

export interface DashboardMonitoringCreateData {
  commandId: number;
  status?: string;
  parsedData: DashboardCommandParsedData;
  missingFields: string[];
}

export interface DashboardMonitoringCreateResponse {
  success: true;
  data: DashboardMonitoringCreateData;
  message: string;
}

export type DashboardCommandExecuteData = DashboardMonitoringCreateData;

export interface DashboardMonitoringCreateRequest {
  commandId: number;
  productName: string;
  platform: string;
  route?: string;
  productDetail: string;
  targetPrice: string;
  monitoringRegisteredAt: string;
  paymentMode: 'ALERT_ONLY' | 'AUTO_PAYMENT';

}

export interface DashboardCommandParseRequest {
  // 2026-05-20 수정: 서버가 토큰에서 userId를 추출하므로 명령문만 보낸다.
  commandText: string;
}

export interface DashboardClarificationSubmissionRequest {
  clarificationInput: string;
  answers: Record<string, string>;
}

export interface DashboardClarificationSubmissionSuccessResponse {
  success: true;
  message: string;
}

export interface DashboardClarificationSubmissionErrorResponse {
  success: false;
  data: null;
  message: string;
}

export type DashboardClarificationSubmissionResponse =
  | DashboardClarificationSubmissionSuccessResponse
  | DashboardClarificationSubmissionErrorResponse;

// 2026-05-20 수정: 상품 후보 (ProductCandidateResponse)
export interface DashboardCommandCandidateItem {
  productId: string;
  title: string;
  lprice: string;
  mallName: string;
  productUrl: string;
  currency: string;
  platform: string;
  searchKeyword: string;
  imageUrl?: string;
}

// 2026-05-20 수정: validationResult
export interface DashboardCommandValidationResult {
  triggeredProducts: DashboardCommandCandidateItem[];
  monitoringProducts: DashboardCommandCandidateItem[];
  purchasedProductId: string | null;
  summaryMessage: string;
  confirmationRequired: boolean;
  duplicateProducts: DashboardCommandCandidateItem[];
  confirmationMessage: string;
}

// 2026-05-20 수정: 명령 세션 조회 응답 (GET /api/v1/commands/{commandId})
export interface DashboardCommandDetailResponseData {
  commandId: string;
  userId: number;
  originalCommand: string;
  status: string;
  missingFields: string[];
  clarificationMessage?: string;
  categoryPath?: string | null;
  candidates: DashboardCommandCandidateItem[];
  selectedProductIds: string[];
  validationResult?: DashboardCommandValidationResult | null;
  targetPrice?: number;
  commandIntent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardCommandDetailSuccessResponse {
  success: true;
  data: DashboardCommandDetailResponseData;
  message: string;
}

export interface DashboardCommandDetailErrorResponse {
  success: false;
  data: null;
  message: string;
}

export type DashboardCommandDetailResponse = DashboardCommandDetailSuccessResponse | DashboardCommandDetailErrorResponse;

// 2026-05-20 수정: 상품 선택 요청
export interface DashboardCommandSelectionRequest {
  selectedProductIds: string[];
  forceResubscribe?: boolean;
}

export interface DashboardCommandSelectionSuccessResponse {
  success: true;
  data: Record<string, unknown>;
  message: string;
}

export interface DashboardCommandSelectionErrorResponse {
  success: false;
  data: null;
  message: string;
}

export type DashboardCommandSelectionResponse =
  | DashboardCommandSelectionSuccessResponse
  | DashboardCommandSelectionErrorResponse;

// 2026-05-20 수정: 상품 URL 제출 요청
export interface DashboardCommandProductLinksRequest {
  productUrls: string[];
}

// [추가] 대시보드 모니터링 목록 API 응답의 기본 형태다.
export interface DashboardMonitoringResponseItem extends DashboardMonitoringItem {
  statusMessage?: string;
  detailLabel?: string;
}
