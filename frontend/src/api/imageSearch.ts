// ---------------------------------------------------------------
// 2026-05-11: API 호출 로직으로 분리 (condition.ts 패턴 적용)
//   - ImageSearchResult, ImageSearchApiResponse 타입을 컴포넌트에서 이관
//   - searchImageByImage() 함수로 API 호출 캡슐화
//   - 엔드포인트: /api/v1/search/image
// ---------------------------------------------------------------

import { createApiClient } from './apiClientFactory.ts';

// API 응답에 포함되는 개별 검색 결과 항목
export type ImageSearchResult = {
  platform: string;
  productName: string;
  price: number;
  currency: string;
  productUrl: string;
  imageUrl: string;
};

// 서버 에러 상세
export type ImageSearchApiError = {
  code: string;
  message: string;
  detail: string | null;
};

// 이미지 검색 API의 응답 전체 구조
export type ImageSearchApiResponse = {
  success: boolean;
  data?: {
    searchId: number;
    recognizedBrand?: string;
    recognizedModel?: string;
    recognizedCategory?: string;
    searchResults?: ImageSearchResult[];
    createdAt?: string;
  };
  error?: ImageSearchApiError;
  message?: string;
};

const imageSearchApiClient = createApiClient({
  baseURL: import.meta.env.VITE_IMAGE_SEARCH_API_BASE_URL as string,
});

/** 업로드한 이미지로 상품을 검색한다. */
export async function searchImageByImage(
  imageFile: File,
): Promise<ImageSearchApiResponse> {
  const formData = new FormData();
  formData.append('image', imageFile);

  const { data } = await imageSearchApiClient.post<ImageSearchApiResponse>(
    '/api/v1/search/image',
    formData,
  );
  return data;
}

// 모니터링 시작 요청 바디
export type StartMonitoringRequest = {
  platform: string;
  maxPrice: number;
  mode: 'AUTO_PAYMENT' | 'ALERT_ONLY';
  maxExecutionCount?: number;
  expiredAt?: string;
};

/** 검색 결과에 대한 모니터링을 시작한다. */
export async function startImageMonitoring(
  searchId: number,
  body: StartMonitoringRequest,
): Promise<{ success: boolean; error?: ImageSearchApiError; message?: string }> {
  const { data } = await imageSearchApiClient.post<{ success: boolean; error?: ImageSearchApiError; message?: string }>(
    `/api/v1/search/image/${searchId}/monitor`,
    body,
  );
  return data;
}

// 이미지 검색 내역 항목
export type ImageSearchHistoryItem = {
  searchId: number;
  recognizedBrand: string;
  recognizedModel: string;
  recognizedCategory: string;
  resultCount: number;
  createdAt: string;
};

// 이미지 검색 내역 조회 응답
export type ImageSearchHistoryResponse = {
  success: boolean;
  data?: {
    history: ImageSearchHistoryItem[];
  };
  message?: string;
  error?: ImageSearchApiError;
};

/** 이미지 검색 내역을 조회한다. */
export async function fetchImageSearchHistory(): Promise<ImageSearchHistoryResponse> {
  const { data } = await imageSearchApiClient.get<ImageSearchHistoryResponse>(
    '/api/v1/search/image/history',
  );
  return data;
}

export default imageSearchApiClient;
