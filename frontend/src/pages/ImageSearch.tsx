import { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { ExternalLink, Image as ImageIcon, Search, Sparkles, Upload, X } from 'lucide-react';
import imageSearchApiClient from '../api/imageSearch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

type ImageSearchResult = {
  platform: string;
  productName: string;
  price: number;
  currency: string;
  productUrl: string;
  imageUrl: string;
};

type ImageSearchApiResponse = {
  success: boolean;
  data?: {
    searchId: number;
    recognizedBrand?: string;
    recognizedModel?: string;
    recognizedCategory?: string;
    searchResults?: ImageSearchResult[];
    createdAt?: string;
  };
  message?: string;
};

type SearchHistoryItem = {
  id: number;
  productName: string;
  thumbnail: string;
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const formatPrice = (price: number, currency: string) => {
  // 통화별 표시를 화면에서 바로 읽을 수 있게 정규화한다.
  if (currency === 'KRW') {
    return `₩${Math.round(price).toLocaleString()}`;
  }

  return `${currency} ${price.toFixed(2)}`;
};

const normalizeSearchResults = (results: ImageSearchResult[] | undefined) => {
  // 서버가 빈 배열이나 누락된 값을 보내도 렌더링이 깨지지 않도록 보정한다.
  return Array.isArray(results) ? results : [];
};

export default function ImageSearch() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchResponse, setSearchResponse] = useState<{ searchId: number; createdAt: string } | null>(null);
  const [aiResult, setAiResult] = useState({
    brand: '',
    model: '',
    category: ''
  });
  const [searchResults, setSearchResults] = useState<ImageSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchHistory] = useState<SearchHistoryItem[]>([
    // 검색 이력은 우선순위가 낮으므로, 현재는 UI 틀만 유지하는 더미 항목을 둔다.
    { id: 1, productName: '검색 이력은 후순위 연동 예정', thumbnail: '🕘' },
  ]);

  useEffect(() => {
    // 선택 파일이 바뀌면 미리보기 URL을 새로 만들고, 변경 전 URL은 정리한다.
    if (!selectedFile) {
      setPreviewUrl('');
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  const fileValidationError = (() => {
    if (!selectedFile) {
      return '';
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(selectedFile.type)) {
      return 'JPG, JPEG, PNG, WEBP 파일만 업로드할 수 있습니다.';
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      return '파일 크기는 10MB 이하만 허용됩니다.';
    }

    return '';
  })();

  const uploadDisabled = isSearching || !selectedFile || Boolean(fileValidationError);

  const handleFileSelection = (file: File | null) => {
    // 새 파일을 선택하면 이전 검색 상태를 모두 초기화한다.
    setSelectedFile(file);
    setSearchError('');
    setSearchResponse(null);
    setAiResult({ brand: '', model: '', category: ''});
    setSearchResults([]);
    setHasSearched(false);
  };

  const handleSearch = async () => {
    if (isSearching) {
      // 중복 요청은 막아서 동일 파일이 여러 번 전송되는 상황을 방지한다.
      return;
    }

    if (!selectedFile) {
      setSearchError('검색할 이미지를 먼저 선택해주세요.');
      return;
    }

    if (fileValidationError) {
      setSearchError(fileValidationError);
      return;
    }

    const formData = new FormData();
    // 서버 계약에 맞춰 이미지 파일은 image 필드로 전송한다.
    formData.append('image', selectedFile);

    try {
      setIsSearching(true);
      setSearchError('');

      // 이미지 검색은 8083 전용 axios 클라이언트를 통해 업로드와 분석을 한 번에 처리한다.
      const { data: payload } = await imageSearchApiClient.post<ImageSearchApiResponse>('/api/search/image', formData);

      if (!payload.success || !payload.data) {
        throw new Error(payload.message || '응답 형식이 올바르지 않습니다.');
      }

      const normalizedResults = normalizeSearchResults(payload.data.searchResults);

      setAiResult({
        brand: payload.data.recognizedBrand ?? '',
        model: payload.data.recognizedModel ?? '',
        category: payload.data.recognizedCategory ?? '',
      });
      setSearchResults(normalizedResults);
      setSearchResponse({
        searchId: payload.data.searchId,
        createdAt: payload.data.createdAt ?? '',
      });
      setHasSearched(true);

      if (normalizedResults.length === 0) {
        setSearchError('검색은 성공했지만 결과가 비어 있습니다.');
      }
    } catch (error) {
      // API 실패, 파싱 실패, 네트워크 실패를 한곳에서 잡고 사용자 메시지는 안전하게 남긴다.
      setSearchError(error instanceof Error ? error.message : '이미지 검색 중 오류가 발생했습니다.');
      setHasSearched(false);
      setSearchResults([]);
      setSearchResponse(null);
    } finally {
      setIsSearching(false);
    }
  };

  const onDrop = (acceptedFiles: File[]) => {
    const nextFile = acceptedFiles[0] ?? null;
    handleFileSelection(nextFile);
  };

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    multiple: false,
    noClick: true,
    noKeyboard: true,
    maxSize: MAX_FILE_SIZE_BYTES,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    onDropAccepted: () => setIsDragging(false),
    onDropRejected: () => {
      setIsDragging(false);
      setSearchError('허용되지 않은 파일 형식이거나 크기가 너무 큽니다.');
      handleFileSelection(null);
    },
  });

  const platformColor = (platform: string) => {
    // 플랫폼 이름은 데이터용이고, 색상은 화면 표시용으로만 정적으로 매핑한다.
    if (platform === 'naver_shopping') return '#03C75A';
    if (platform === 'coupang') return '#26eef5';
    if (platform === 'aliexpress') return '#E62E04';

    return '#64748b';
  };

  return (
    <div className="p-6 bg-gray-100">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-foreground">이미지 검색</h1>
      </div>
      <p className="text-sm text-muted-foreground">이미지로 상품 찾기 · Gemini AI 분석</p>

      {/* 이미지 업로드 영역 */}
      <Card className="bg-white border-[#e2e8f0] shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="text-[#0f172a]">상품 이미지 업로드</CardTitle>
          <CardDescription className="text-[#64748b]">
            상품 이미지를 업로드하면 AI가 자동으로 인식하여 최저가를 찾아드립니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center bg-[#f8fafc] transition-colors cursor-pointer ${
              isDragging ? 'border-[#10b981] bg-[#ecfdf5]' : 'border-[#e2e8f0] hover:border-[#10b981]'
            }`}
          >
            <input {...getInputProps()} />
            {previewUrl ? (
              <div className="mx-auto mb-4 max-w-xs">
                <img
                  src={previewUrl}
                  alt="선택한 상품 미리보기"
                  className="mx-auto h-56 w-full rounded-lg border border-[#e2e8f0] object-contain bg-white"
                />
              </div>
            ) : (
              <ImageIcon className="w-16 h-16 text-[#cbd5e1] mx-auto mb-4" />
            )}
            <p className="text-[#64748b] mb-4">{selectedFile ? selectedFile.name : '상품 이미지를 업로드하세요'}</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button className="bg-[#10b981] text-white hover:bg-[#059669] shadow-md" type="button" onClick={open}>
                <Upload className="w-4 h-4 mr-2" />
                파일 선택
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={() => handleFileSelection(null)}
                disabled={!selectedFile || isSearching}
                className="border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc]"
              >
                <X className="w-4 h-4 mr-2" />
                초기화
              </Button>
            </div>
            <p className="text-[#94a3b8] text-xs mt-4">JPEG, PNG, WEBP 형식 지원 · 파일 크기 10MB 이하</p>
            {fileValidationError && <p className="mt-3 text-sm text-red-500">{fileValidationError}</p>}
            {searchError && <p className="mt-3 text-sm text-red-500">{searchError}</p>}
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              className="bg-[#10b981] text-white hover:bg-[#059669] shadow-md"
              onClick={handleSearch}
              disabled={uploadDisabled}
            >
              <Search className="w-4 h-4 mr-2" />
              {isSearching ? '검색 중...' : '이미지 검색'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 검색 후 결과 영역 */}
      {hasSearched && (
        <>
          <Card className="bg-gradient-to-br from-[#f0fdf4] to-white border-[#10b981]/20 shadow-sm mb-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#10b981]" />
                <CardTitle className="text-[#0f172a]">AI 인식 결과</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-[#e2e8f0]">
                  <p className="text-[#94a3b8] text-xs mb-1">브랜드</p>
                  <p className="text-[#0f172a] font-semibold text-lg">{aiResult.brand || '-'}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-[#e2e8f0]">
                  <p className="text-[#94a3b8] text-xs mb-1">모델</p>
                  <p className="text-[#0f172a] font-semibold text-lg">{aiResult.model || '-'}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-[#e2e8f0]">
                  <p className="text-[#94a3b8] text-xs mb-1">카테고리</p>
                  <p className="text-[#0f172a] font-semibold text-lg">{aiResult.category || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 쇼핑몰 검색 결과 */}
          <Card className="bg-white border-[#e2e8f0] shadow-sm mb-6">
            <CardHeader className="border-b border-[#e2e8f0]">
              <CardTitle className="text-[#0f172a]">쇼핑몰 검색 결과</CardTitle>
              <CardDescription className="text-[#64748b]">다양한 플랫폼에서 찾은 최저가 정보입니다</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-[#e2e8f0]">
                {searchResults.length === 0 ? (
                  <div className="p-5 text-sm text-[#64748b]">검색 결과가 아직 없습니다.</div>
                ) : (
                  searchResults.map((result, index) => (
                    <div key={`${result.platform}-${index}`} className="p-5 hover:bg-[#f8fafc] transition-colors">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <Badge
                            className="mb-2"
                            style={{
                              backgroundColor: `${platformColor(result.platform)}15`,
                              borderColor: `${platformColor(result.platform)}40`,
                              color: platformColor(result.platform),
                            }}
                          >
                            {result.platform}
                          </Badge>
                          <p className="text-[#0f172a] font-medium mb-1">{result.productName}</p>
                          <p className="text-[#10b981] text-2xl font-bold">{formatPrice(result.price, result.currency)}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc]"
                            asChild
                          >
                            <a href={result.productUrl} target="_blank" rel="noreferrer">
                              <ExternalLink className="w-4 h-4 mr-2" />
                              바로가기
                            </a>
                          </Button>
                          <Button size="sm" className="bg-[#10b981] text-white hover:bg-[#059669] shadow-md">
                            모니터링 시작
                          </Button>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-[#94a3b8]">{result.imageUrl}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* 이미지 검색 히스토리 */}
      <Card className="bg-white border-[#e2e8f0] shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#0f172a]">최근 검색 이력</CardTitle>
          <CardDescription className="text-[#64748b]">최근에 검색한 상품들입니다</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {searchHistory.map((item) => (
              <div
                key={item.id}
                className="flex-shrink-0 w-32 p-3 border border-[#e2e8f0] rounded-lg hover:border-[#10b981] hover:shadow-md transition-all cursor-pointer bg-[#f8fafc]"
              >
                <div className="w-full aspect-square bg-white rounded-lg flex items-center justify-center text-4xl mb-2 border border-[#e2e8f0]">
                  {item.thumbnail}
                </div>
                <p className="text-[#0f172a] text-xs font-medium text-center truncate">{item.productName}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
