// 추천 카테고리 정보
export interface RecommendationCategory {
  categoryId: string;
  categoryName: string;
  description: string;
  productCount: number;
  lastAnalysisDate: string;
}

// 카테고리 목록 API 응답
export interface CategoryListResponse {
  success: boolean;
  data: {
    categories: RecommendationCategory[];
    totalCategories: number;
  };
  message: string;
}

// 유튜버 개별 리뷰 (상세 조회에서 사용)
export interface YoutuberReview {
  youtuber: string;
  videoUrl: string;
  pros: string;
  cons: string;
  analysisDate: string;
}

// 추천 상품 정보 (목록 - 단일 유튜버)
export interface RecommendationItem {
  productId: number;
  rank: number;
  productName: string;
  brand: string;
  pros: string;
  cons: string;
  youtuber: string;
  videoUrl: string;
  analysisDate: string;
}

// 추천 상품 상세 정보 (다중 유튜버 리뷰 포함)
export interface RecommendationDetail {
  productId: number;
  category: string;
  categoryName: string;
  rank: number;
  productName: string;
  brand: string;
  pros: string;
  cons: string;
  youtuberReviews: YoutuberReview[];
  analysisDate: string;
  createdAt: string;
  updatedAt: string;
}

// 카테고리별 추천 상품 목록 API 응답
export interface RecommendationListResponse {
  success: boolean;
  data: {
    category: string;
    categoryName: string;
    lastAnalysisDate: string;
    recommendations: RecommendationItem[];
    totalElements: number;
    totalPages: number;
    currentPage: number;
  };
  message: string;
}

// 추천 상품 상세 조회 API 응답
export interface RecommendationDetailResponse {
  success: boolean;
  data: RecommendationDetail;
  message: string;
}
