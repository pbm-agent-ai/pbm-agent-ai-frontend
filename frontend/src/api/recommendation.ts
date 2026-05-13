import apiClient from './axios';
import type {
  CategoryListResponse,
  RecommendationListResponse,
  RecommendationDetailResponse,
} from '@/types/recommendation';

/** 추천 카테고리 목록을 조회한다. */
export async function fetchRecommendationCategories(): Promise<CategoryListResponse> {
  const { data } = await apiClient.get<CategoryListResponse>('/api/v1/recommendations/categories');
  return data;
}

/** 특정 카테고리의 추천 상품 목록을 조회한다. */
export async function fetchRecommendationItems(category: string): Promise<RecommendationListResponse> {
  const { data } = await apiClient.get<RecommendationListResponse>(`/api/v1/recommendations/${category}`);
  return data;
}

/** 특정 추천 상품의 상세 정보를 조회한다. (유튜버 다중 리뷰 포함) */
export async function fetchRecommendationDetail(category: string, productId: number): Promise<RecommendationDetailResponse> {
  const { data } = await apiClient.get<RecommendationDetailResponse>(
    `/api/v1/recommendations/${category}/${productId}`
  );
  return data;
}
