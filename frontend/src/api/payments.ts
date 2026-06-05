import { createApiClient } from './apiClientFactory';

const paymentApiClient = createApiClient({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
});

// ── 타입 정의 ───────────────────────────────────────────────────────────────

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface PaymentSummary {
  paymentId: string;
  userId: number;
  productName: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
}

export interface PaymentDetail extends PaymentSummary {
  productUrl: string | null;
  transactionHash: string | null;
  failureReason: string | null;
  updatedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

// ── API 함수 ────────────────────────────────────────────────────────────────

/**
 * 현재 사용자의 결제 내역 목록을 조회한다.
 */
export async function fetchMyPayments(): Promise<PaymentSummary[]> {
  try {
    const { data } = await paymentApiClient.get<ApiResponse<PaymentSummary[]>>('/api/v1/payments');
    return data.success ? (data.data ?? []) : [];
  } catch {
    return [];
  }
}

/**
 * 결제 단건 상세를 조회한다.
 */
export async function fetchPaymentDetail(paymentId: string): Promise<PaymentDetail | null> {
  try {
    const { data } = await paymentApiClient.get<ApiResponse<PaymentDetail>>(
      `/api/v1/payments/${paymentId}`,
    );
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}
