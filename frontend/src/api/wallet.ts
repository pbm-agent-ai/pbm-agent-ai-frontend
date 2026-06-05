import { createApiClient } from './apiClientFactory';

const walletApiClient = createApiClient({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
});

// ── 타입 정의 ───────────────────────────────────────────────────────────────

export interface WalletResponse {
  id: number;
  userId: number;
  walletAddress: string;
  walletLimit: number;
  createdAt: string;
}

export interface WalletBalanceResponse {
  walletAddress: string;
  pbmBalance: number;
  pbmBalanceWei: string;
}

export interface WalletCreateRequest {
  walletLimitKrw: number;
}

// ── Provisioning Status ──────────────────────────────────────────────────

/** 개별 프로비저닝 단계 (UI 표시용) */
export interface ProvisioningStep {
  name: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

/** 지갑 프로비저닝 상태 (비동기 생성 진행 상황) */
export interface ProvisioningStatusResponse {
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  steps: ProvisioningStep[];
  errorMessage?: string;
}

/** 백엔드 WalletProvisioningResponse raw 응답 (서버 스펙 직접 매핑) */
interface RawProvisioningStatusResponse {
  status: string;           // enum name: NOT_STARTED, KEYPAIR_CREATED, ...
  label: string;
  message: string;
  currentStep: number;      // 0~6 (FAILED=-1)
  totalSteps: number;       // 항상 7
  updatedAt: string;        // ISO-8601 Instant
  errorMessage: string | null;
}

/**
 * 백엔드 WalletProvisioningStatus 7단계에 대응하는 UI 단계 레이블.
 * 인덱스 0~6이 각 단계 번호와 일치한다.
 */
const PROVISIONING_STEP_LABELS: readonly string[] = [
  '지갑 생성 준비 중',             // 0: NOT_STARTED
  '사용자 지갑 주소 생성',         // 1: KEYPAIR_CREATED
  '마스터 지갑에서 ETH 지급 중',   // 2: FUNDING_USER_EOA
  '마스터 지갑에서 ETH 지급 완료', // 3: USER_EOA_FUNDED
  '스마트 지갑 배포 중',           // 4: CREATING_SMART_WALLET
  '스마트 지갑 배포 완료',         // 5: SMART_WALLET_CREATED
  '지갑 생성 완료',                // 6: SAVED
];

/**
 * 백엔드 RawProvisioningStatusResponse를 프론트 ProvisioningStatusResponse로 변환한다.
 *
 * currentStep을 기준으로 각 단계의 완료/진행/대기 상태를 결정하고,
 * FAILED 상태 전체 단계를 pending으로 표시한다 (에러 메시지는 별도 표시).
 */
function toProvisioningStatusResponse(raw: RawProvisioningStatusResponse): ProvisioningStatusResponse {
  const { currentStep, totalSteps } = raw;
  const isFailed = raw.status === 'FAILED';

  // ── 전체 상태 (폴링 중단 조건: completed/failed) ──
  let overallStatus: ProvisioningStatusResponse['status'];
  if (isFailed) {
    overallStatus = 'failed';
  } else if (currentStep >= totalSteps - 1) {
    // SAVED(step 6) → 전체 완료
    overallStatus = 'completed';
  } else if (currentStep > 0) {
    overallStatus = 'in_progress';
  } else {
    // NOT_STARTED(step 0) → 대기
    overallStatus = 'pending';
  }

  // ── 개별 단계 상태 배열 ──
  const steps: ProvisioningStep[] = [];
  for (let i = 0; i < totalSteps; i++) {
    let stepStatus: ProvisioningStep['status'];
    if (isFailed) {
      // 실패 시 모든 단계는 대기 상태 (에러 메시지는 provisioningError로 표시)
      stepStatus = 'pending';
    } else if (i < currentStep) {
      stepStatus = 'completed';
    } else if (i === currentStep) {
      // NOT_STARTED(step 0)는 pending, 마지막 단계(step 6)는 completed
      stepStatus = currentStep === 0 ? 'pending' : (i === totalSteps - 1 ? 'completed' : 'in_progress');
    } else {
      stepStatus = 'pending';
    }
    steps.push({
      name: `step-${i}`,
      label: PROVISIONING_STEP_LABELS[i] ?? `Step ${i + 1}`,
      status: stepStatus,
    });
  }

  return {
    status: overallStatus,
    steps,
    errorMessage: raw.errorMessage ?? undefined,
  };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

// ── API 함수 ────────────────────────────────────────────────────────────────

/**
 * 현재 사용자의 PBM 스마트 지갑 정보를 조회한다.
 * 지갑이 없으면 null을 반환한다.
 */
export async function fetchMyWallet(): Promise<WalletResponse | null> {
  try {
    const { data } = await walletApiClient.get<ApiResponse<WalletResponse>>('/api/v1/wallet');
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}

/**
 * PBM 스마트 지갑을 생성한다.
 * - 이미 존재하면 기존 지갑 정보를 반환한다.
 * - 비동기 생성이 시작된 경우 null을 반환한다. (provisioning-status 폴링 필요)
 */
export async function createMyWallet(walletLimitKrw: number): Promise<WalletResponse | null> {
  const { data } = await walletApiClient.post<ApiResponse<WalletResponse | null>>(
    '/api/v1/wallet',
    { walletLimitKrw } satisfies WalletCreateRequest,
  );

  if (!data.success) {
    throw new Error(data.message);
  }

  return data.data;
}

/**
 * 지갑 프로비저닝 상태를 조회한다.
 * createMyWallet이 null을 반환한 경우 이 API를 폴링하여 진행 상황을 추적한다.
 *
 * 백엔드 WalletProvisioningResponse(record)를 받아 내부적으로 단계 배열로 변환하여 반환한다.
 */
export async function fetchProvisioningStatus(): Promise<ProvisioningStatusResponse | null> {
  try {
    const { data } = await walletApiClient.get<ApiResponse<RawProvisioningStatusResponse>>(
      '/api/v1/wallet/provisioning-status',
    );
    if (!data.success || !data.data) return null;
    return toProvisioningStatusResponse(data.data);
  } catch {
    return null;
  }
}

/**
 * PBM 토큰 잔액을 블록체인에서 직접 조회한다.
 */
export async function fetchMyWalletBalance(): Promise<WalletBalanceResponse | null> {
  try {
    const { data } = await walletApiClient.get<ApiResponse<WalletBalanceResponse>>('/api/v1/wallet/balance');
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}
