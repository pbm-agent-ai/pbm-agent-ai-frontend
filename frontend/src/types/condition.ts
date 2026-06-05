export interface ConditionOptionsPayload {
  flight_type: string;
  trip_type: string;
}

// 조건 생성과 조회에서 공통으로 쓰는 조건의 핵심 정보다.
export interface ConditionCoreFields {
  platform: string;
  keyword: string;
  maxPrice: number;
  mode: 'AUTO_PAYMENT' | 'ALERT_ONLY';
  // 현재 결제 회수와 최대 결제 허용 횟수를 함께 관리한다.
  maxExecutionCount?: number;
  expiredAt?: string;
  options?: ConditionOptionsPayload;
}

// 항공권 조건에서 최근 가격 이력을 표현할 때 쓰는 항목이다.
export interface ConditionRecentPriceItem {
  price: number;
  collectedAt: string;
}

// 새 조건을 등록할 때 서버로 보내는 요청 데이터다.
export interface ConditionCreateRequest extends ConditionCoreFields {
  commandId: number;
}

// 조건 상세 수정 시 서버로 보내는 요청 데이터다.
export interface ConditionUpdateRequest {
  maxPrice?: number;
  mode?: 'AUTO_PAYMENT' | 'ALERT_ONLY';
  maxExecutionCount?: number;
  expiredAt?: string;
  options?: ConditionOptionsPayload;
}

// 조건 생성 요청에 대한 서버 응답 데이터다.
export interface ConditionCreateResponse extends Partial<ConditionCoreFields> {
  conditionId?: number;
  commandId?: number;
  currentPrice?: number;
  isActive?: boolean;
  message?: string;
}

// 조건 상세 수정 요청에 대한 서버 응답 데이터다.
export interface ConditionUpdateResponse {
  success?: boolean;
  message?: string;
  data?: Partial<ConditionCoreFields> & {
    conditionId?: number;
    currentPrice?: number;
    priceDiff?: number;
    currentExecutionCount?: number;
    lastCheckedAt?: string;
    createdAt?: string;
    updatedAt?: string;
    isActive?: boolean;
  };
}

// 조건 삭제 요청에 대한 서버 응답 데이터다.
export interface ConditionDeleteResponse {
  success?: boolean;
  message?: string;
  data?: {
    conditionId?: number;
  };
}

// 조건 카드에 표시할 기본 정보다.
export interface ConditionCardItem extends ConditionCoreFields {
  conditionId: number;
  commandId?: number;
  currentPrice?: number;
  isActive: boolean;
  imageUrl?: string;
  updatedAt?: string;
}

export interface ConditionListMetadata {
  // 현재가 - 목표가 값을 담는다. 양수면 아직 목표가에 못 미치고, 음수면 목표가를 충족한 상태다.
  priceDiff?: number;
  // 현재 결제 횟수이다.
  currentExecutionCount?: number;
  lastCheckedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

// 목록 조회 응답의 각 조건 항목이다.
export interface ConditionListItem extends ConditionCardItem, ConditionListMetadata {}

// 조건 목록 조회 응답의 페이지 정보다.
export interface ConditionListPagination {
  totalElements: number;
  totalPages: number;
  currentPage: number;
}

// 조건 상세 조회에서 반환되는 단일 조건의 전체 정보다. 식별자는 제외하고, 나머지 상세 정보만 담는다.
export interface ConditionDetailItem extends Omit<ConditionCardItem, 'conditionId' | 'commandId'> {
  // 현재가 - 목표가 값을 담는다. 양수면 아직 목표가에 못 미치고, 음수면 목표가를 충족한 상태다.
  priceDiff?: number;
  // 현재 결제 횟수이다.
  currentExecutionCount: number;
  lastCheckedAt: string;
  // 최근 수집된 가격 3개를 담는다. Drawer의 미니 차트 렌더링에 사용한다.
  recentPrices: ConditionRecentPriceItem[];
  createdAt: string;
  updatedAt?: string;
}

// 조건 상세 조회 API의 응답 envelope다.
export interface ConditionDetailResponse {
  success: boolean;
  data: ConditionDetailItem;
  message: string;
}

// 조건 목록 조회 API의 응답 envelope다.
export interface ConditionListResponse {
  success: boolean;
  data: ConditionListPagination & {
    conditions: ConditionListItem[];
  };
  message: string;
}

export interface SubscriptionItem {
  id: number;
  commandId: string;
  platform: string;
  productId: string;
  productUrl: string;
  snapshotTitle: string;
  snapshotPrice: number;
  snapshotImageUrl?: string;
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
