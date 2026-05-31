export interface ConditionCardItem {
  conditionId: number;
  commandId?: number;
  platform: string;
  keyword: string;
  maxPrice: number;
  mode: 'AUTO_PAYMENT' | 'ALERT_ONLY';
  maxExecutionCount?: number;
  expiredAt?: string;
  currentPrice?: number;
  isActive: boolean;
  updatedAt?: string;
}

export interface SubscriptionItem {
  id: number;
  commandId: string;
  platform: string;
  productId: string;
  productUrl: string;
  snapshotTitle: string;
  snapshotPrice: number;
  searchKeyword: string;
  targetPrice: number;
  currency: string;
  intent: 'AUTO_PAYMENT' | 'ALERT_ONLY';
  status: 'ACTIVE' | 'INACTIVE';
  checkIntervalMinutes: number;
  lastCheckedAt: string;
  nextCheckAt: string;
  scheduledEndAt: string;
  createdAt: string;
}

export interface SubscriptionListResponse {
  success: boolean;
  data: SubscriptionItem[];
  message: string;
}

export interface SubscriptionUpdateRequest {
  intent?: 'AUTO_PAYMENT' | 'ALERT_ONLY';
  targetPrice?: number;
  scheduledEndAt?: string;
}

export interface SubscriptionUpdateResponse {
  success: boolean;
  data: SubscriptionItem;
  message: string;
}

export interface SubscriptionDeleteResponse {
  success: boolean;
  message: string;
}

export interface ConditionListMetadata {
  priceDiff?: number;
  currentExecutionCount?: number;
  lastCheckedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConditionListItem extends ConditionCardItem, ConditionListMetadata {}

export interface ConditionListPagination {
  totalElements: number;
  totalPages: number;
  currentPage: number;
}

export interface ConditionListResponse {
  success: boolean;
  data: ConditionListPagination & {
    conditions: ConditionListItem[];
  };
  message: string;
}
