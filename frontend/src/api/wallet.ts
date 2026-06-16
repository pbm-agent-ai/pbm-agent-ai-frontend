import { createApiClient } from './clients/apiClientFactory';
import { useAuthStore } from '../store/authStore';

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

export interface WalletLimitUpdateRequest {
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

export async function updateMyWalletLimit(walletLimitKrw: number): Promise<WalletResponse> {
  const { data } = await walletApiClient.put<ApiResponse<WalletResponse>>(
    '/api/v1/wallet/limit',
    { walletLimitKrw } satisfies WalletLimitUpdateRequest,
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

// ── 토큰 충전 ────────────────────────────────────────────────────────────────

export type TokenTransactionType = 'CHARGE' | 'DEDUCT' | 'FEE';
export type TokenTransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

/** 토큰 충전 결과 */
export interface TokenChargeResponse {
  transactionId: number;
  walletAddress: string;
  amountPbm: number;
  amountWei: string;
  txHash: string | null;
  status: TokenTransactionStatus;
  createdAt: string;
}

/** 충전·차감·수수료 통합 거래 내역 항목 */
export interface TokenTransactionResponse {
  id: number;
  type: TokenTransactionType;
  amountPbm: number;
  amountWei: string;
  txHash: string | null;
  status: TokenTransactionStatus;
  note: string | null;
  createdAt: string;
}

/**
 * PBM 토큰을 충전한다.
 * 마스터 지갑 → 사용자 PBMSmartAccount로 ERC-20 transfer 실행.
 * 블록체인 확정까지 대기하므로 수십 초 소요될 수 있다.
 *
 * @param amountPbm 충전 수량 (PBM 정수 단위)
 */
export async function chargeWallet(amountPbm: number): Promise<TokenChargeResponse> {
  const { data } = await walletApiClient.post<ApiResponse<TokenChargeResponse>>(
    '/api/v1/wallet/charge',
    { amountPbm },
  );
  if (!data.success) {
    throw new Error(data.message ?? '충전에 실패했습니다.');
  }
  return data.data;
}

/**
 * 충전·차감·수수료 전체 거래 내역을 최신순으로 조회한다.
 */
export async function fetchTransactionHistory(): Promise<TokenTransactionResponse[]> {
  try {
    const { data } = await walletApiClient.get<ApiResponse<TokenTransactionResponse[]>>(
      '/api/v1/wallet/transactions',
    );
    return data.success ? (data.data ?? []) : [];
  } catch {
    return [];
  }
}

/**
 * 충전 내역만 조회한다.
 */
export async function fetchChargeHistory(): Promise<TokenTransactionResponse[]> {
  try {
    const { data } = await walletApiClient.get<ApiResponse<TokenTransactionResponse[]>>(
      '/api/v1/wallet/charge/history',
    );
    return data.success ? (data.data ?? []) : [];
  } catch {
    return [];
  }
}

// ── 지갑 생성 진행 단계 SSE ──────────────────────────────────────────────────

export interface WalletProvisioningCallbacks {
  /** 각 단계 이벤트 수신 시 (폴링의 fetchProvisioningStatus()와 동일한 구조) */
  onStep: (status: ProvisioningStatusResponse) => void;
  /** "DONE" 이벤트 수신 시 (정상 완료) */
  onDone: () => void;
  /** "FAILED" 이벤트 수신 시 */
  onFailed: (reason: string) => void;
}

/**
 * 지갑 생성 진행 단계 SSE 스트림을 구독한다.
 * SSE 이벤트 data는 RawProvisioningStatusResponse 구조이므로
 * 기존 toProvisioningStatusResponse() 변환 함수를 그대로 재사용한다.
 *
 * 사용 흐름:
 *   1. subscribeToWalletCreation() 호출 → CONNECTED 이벤트 수신 시 onConnected 콜백 실행
 *   2. onConnected 안에서 createMyWallet()을 호출하여 지갑 생성 시작
 *   3. 각 단계 이벤트가 onStep으로 전달됨 (provisioningSteps UI 업데이트)
 *   4. DONE / FAILED 이벤트 수신 시 스트림 자동 종료
 *
 * @returns 스트림을 강제 종료할 수 있는 AbortController
 */
export function subscribeToWalletCreation(
  callbacks: WalletProvisioningCallbacks,
  onConnected: () => void,
): AbortController {
  const store = useAuthStore.getState();
  const token = store.accessToken;
  const tokenType = store.tokenType ?? 'Bearer';
  const userId = store.userId;
  const controller = new AbortController();
  const baseURL = import.meta.env.VITE_API_BASE_URL ?? '';

  (async () => {
    try {
      const response = await fetch(`${baseURL}/api/v1/wallet/provisioning-status/stream`, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `${tokenType} ${token}` } : {}),
          ...(userId != null ? { 'X-User-Id': String(userId) } : {}),
        },
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        callbacks.onFailed('SSE 스트림 연결 실패');
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice('event:'.length).trim();
          } else if (line.startsWith('data:')) {
            const dataStr = line.slice('data:'.length).trim();
            try {
              if (currentEvent === 'CONNECTED') {
                onConnected();
              } else if (currentEvent === 'DONE') {
                callbacks.onDone();
                controller.abort();
                return;
              } else if (currentEvent === 'FAILED') {
                const payload = JSON.parse(dataStr) as RawProvisioningStatusResponse;
                callbacks.onFailed(payload.errorMessage ?? '지갑 생성에 실패했습니다.');
                controller.abort();
                return;
              } else {
                // 진행 단계 이벤트 — 폴링과 동일한 RawProvisioningStatusResponse 구조
                const payload = JSON.parse(dataStr) as RawProvisioningStatusResponse;
                callbacks.onStep(toProvisioningStatusResponse(payload));
              }
            } catch { /* JSON 파싱 실패 무시 */ }
            currentEvent = '';
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        callbacks.onFailed('SSE 연결 중 오류 발생');
      }
    }
  })();

  return controller;
}

// ── 충전 진행 단계 SSE ────────────────────────────────────────────────────────

export type ChargeProgressStep =
  | 'CONNECTED'
  | 'REQUEST_RECEIVED'
  | 'DB_SAVED'
  | 'TX_SENT'
  | 'TX_CONFIRMED'
  | 'CHARGE_COMPLETED'
  | 'GAS_CALCULATED'
  | 'GAS_DEDUCT_STARTED'
  | 'GAS_TX_SENT'
  | 'GAS_TX_CONFIRMED'
  | 'GAS_DEDUCT_COMPLETED'
  | 'GAS_DEDUCT_FAILED'
  | 'DONE'
  | 'FAILED';

export type WalletLimitProgressStep =
  | 'CONNECTED'
  | 'REQUEST_RECEIVED'
  | 'VALIDATION_COMPLETED'
  | 'ONCHAIN_UPDATE_STARTED'
  | 'TX_SENT'
  | 'TX_CONFIRMED'
  | 'ONCHAIN_UPDATE_COMPLETED'
  | 'DB_UPDATED'
  | 'DONE'
  | 'FAILED';

export interface ChargeProgressEvent {
  step: ChargeProgressStep;
  message: string;
  detail: string | null;
}

export interface WalletLimitProgressEvent {
  step: WalletLimitProgressStep;
  message: string;
  detail: string | null;
}

export interface ChargeProgressCallbacks {
  /** 각 단계 이벤트 수신 시 */
  onStep: (event: ChargeProgressEvent) => void;
  /** "DONE" 이벤트 수신 시 (정상 완료) */
  onDone: () => void;
  /** "FAILED" 이벤트 수신 시 */
  onFailed: (reason: string) => void;
}

/**
 * 충전 진행 단계 SSE 스트림을 구독한다.
 * EventSource는 Authorization 헤더를 지원하지 않으므로 fetch + ReadableStream으로 구현한다.
 *
 * 사용 흐름:
 *   1. subscribeToChargeProgress() 호출 → CONNECTED 이벤트를 받으면 onConnected 콜백 실행
 *   2. onConnected 안에서 chargeWallet()을 호출하여 충전 시작
 *   3. 각 단계 이벤트가 onStep으로 전달됨
 *   4. DONE / FAILED 이벤트 수신 시 스트림 자동 종료
 *
 * @returns 스트림을 강제 종료할 수 있는 AbortController
 */
export function subscribeToChargeProgress(
  callbacks: ChargeProgressCallbacks,
  onConnected: () => void,
): AbortController {
  const store = useAuthStore.getState();
  const token = store.accessToken;
  const tokenType = store.tokenType ?? 'Bearer';
  const userId = store.userId;
  const controller = new AbortController();
  const baseURL = import.meta.env.VITE_API_BASE_URL ?? '';

  (async () => {
    try {
      const response = await fetch(`${baseURL}/api/v1/wallet/charge/stream`, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `${tokenType} ${token}` } : {}),
          ...(userId != null ? { 'X-User-Id': String(userId) } : {}),
        },
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        callbacks.onFailed('SSE 스트림 연결 실패');
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice('event:'.length).trim();
          } else if (line.startsWith('data:')) {
            const dataStr = line.slice('data:'.length).trim();
            try {
              const payload: ChargeProgressEvent = JSON.parse(dataStr);
              if (currentEvent === 'CONNECTED') {
                onConnected();
              } else if (currentEvent === 'DONE') {
                callbacks.onDone();
                controller.abort();
                return;
              } else if (currentEvent === 'FAILED') {
                callbacks.onFailed(payload.detail ?? payload.message ?? '알 수 없는 오류');
                controller.abort();
                return;
              } else {
                callbacks.onStep(payload);
              }
            } catch { /* JSON 파싱 실패 무시 */ }
            currentEvent = '';
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        callbacks.onFailed('SSE 연결 중 오류 발생');
      }
    }
  })();

  return controller;
}

export interface WalletLimitProgressCallbacks {
  onStep: (event: WalletLimitProgressEvent) => void;
  onDone: () => void;
  onFailed: (reason: string) => void;
}

export function subscribeToWalletLimitProgress(
  callbacks: WalletLimitProgressCallbacks,
  onConnected: () => void,
): AbortController {
  const store = useAuthStore.getState();
  const token = store.accessToken;
  const tokenType = store.tokenType ?? 'Bearer';
  const userId = store.userId;
  const controller = new AbortController();
  const baseURL = import.meta.env.VITE_API_BASE_URL ?? '';

  (async () => {
    try {
      const response = await fetch(`${baseURL}/api/v1/wallet/limit/stream`, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `${tokenType} ${token}` } : {}),
          ...(userId != null ? { 'X-User-Id': String(userId) } : {}),
        },
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        callbacks.onFailed('SSE 스트림 연결 실패');
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice('event:'.length).trim();
          } else if (line.startsWith('data:')) {
            const dataStr = line.slice('data:'.length).trim();
            try {
              const payload: WalletLimitProgressEvent = JSON.parse(dataStr);
              if (currentEvent === 'CONNECTED') {
                onConnected();
              } else if (currentEvent === 'DONE') {
                callbacks.onDone();
                controller.abort();
                return;
              } else if (currentEvent === 'FAILED') {
                callbacks.onFailed(payload.detail ?? payload.message ?? '알 수 없는 오류');
                controller.abort();
                return;
              } else {
                callbacks.onStep(payload);
              }
            } catch { /* JSON 파싱 실패 무시 */ }
            currentEvent = '';
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        callbacks.onFailed('SSE 연결 중 오류 발생');
      }
    }
  })();

  return controller;
}
