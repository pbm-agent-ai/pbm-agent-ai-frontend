import { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Award, Box, ExternalLink, Folder, Image as ImageIcon, Search, Sparkles, Tag, Upload, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { searchImageByImage, startImageMonitoring, fetchImageSearchHistory } from '../api/imageSearch';
import type { ImageSearchResult } from '../api/imageSearch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

type SearchHistoryItem = {
  searchId: number;
  recognizedBrand: string;
  recognizedModel: string;
  recognizedCategory: string;
  resultCount: number;
  createdAt: string;
};

const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

const formatPrice = (price: number, currency: string) => {
  if (currency === 'KRW') {
    return `₩${Math.round(price).toLocaleString()}`;
  }
  return `${currency} ${price.toFixed(2)}`;
};

const normalizeSearchResults = (results: ImageSearchResult[] | undefined) => {
  return Array.isArray(results) ? results : [];
};

export default function ImageSearch() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [searchResponse, setSearchResponse] = useState<{ searchId: number; createdAt: string } | null>({
    searchId: 46,
    createdAt: '2026-04-16T10:30:00',
  });
  const [monitoringSearchId, setMonitoringSearchId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [monitorForm, setMonitorForm] = useState({
    maxPrice: '',
    mode: 'AUTO_PAYMENT' as 'AUTO_PAYMENT' | 'ALERT_ONLY',
    maxExecutionCount: '',
    expiryYear: '',
    expiryMonth: '',
    expiryDay: '',
  });

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 90 }, (_, index) => String(currentYear + index));
  };
  const getMonthOptions = () => Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));
  const getDayOptions = () => {
    if (!monitorForm.expiryMonth) return [];
    const year = Number(monitorForm.expiryYear);
    const month = Number(monitorForm.expiryMonth);
    const maxDay = getDaysInMonth(year, month);
    return Array.from({ length: maxDay }, (_, index) => String(index + 1).padStart(2, '0'));
  };

  const [aiResult, setAiResult] = useState({
    brand: '삼성전자',
    model: '갤럭시북4',
    category: '노트북'
  });
  const [searchResults, setSearchResults] = useState<ImageSearchResult[]>([
    {
      platform: 'coupang',
      productName: '삼성전자 갤럭시북4 NT750XGR-AC71S',
      price: 1490,
      currency: 'KRW',
      productUrl: 'https://www.coupang.com/example',
      imageUrl: 'https://example.com/galaxybook4.jpg',
    },
    {
      platform: 'naver_shopping',
      productName: '삼성 갤럭시북4 15.6인치',
      price: 1420000,
      currency: 'KRW',
      productUrl: 'https://shopping.naver.com/example',
      imageUrl: 'https://example.com/galaxybook4_naver.jpg',
    },
    {
      platform: 'aliexpress',
      productName: 'Samsung Galaxy Book4 Laptop 15.6"',
      price: 989.99,
      currency: 'USD',
      productUrl: 'https://www.aliexpress.com/example',
      imageUrl: 'https://example.com/galaxybook4_aliexpress.jpg',
    },
  ]);
  const [hasSearched, setHasSearched] = useState(true);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([
    {
      searchId: 45,
      recognizedBrand: '로보락',
      recognizedModel: 'S8 Pro',
      recognizedCategory: '로봇청소기',
      resultCount: 3,
      createdAt: '2026-04-16T10:30:00',
    }
  ]);

  useEffect(() => {
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

  useEffect(() => {
    fetchImageSearchHistory()
      .then((res) => {
        if (res.success && res.data) {
          setSearchHistory(res.data.history);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const year = Number(monitorForm.expiryYear);
    const month = Number(monitorForm.expiryMonth);
    const maxDay = getDaysInMonth(year, month);
    const currentDay = Number(monitorForm.expiryDay);

    if (currentDay > maxDay) {
      setMonitorForm((prev) => ({ ...prev, expiryDay: String(maxDay).padStart(2, '0') }));
    }
  }, [monitorForm.expiryYear, monitorForm.expiryMonth, monitorForm.expiryDay]);

  const uploadDisabled = isSearching;

  const handleFileSelection = (file: File | null) => {
    setSelectedFile(file);
    setSearchResponse(null);
    setAiResult({ brand: '', model: '', category: ''});
    setSearchResults([]);
    setHasSearched(false);
  };

  const handleSearch = async () => {
    if (isSearching) return;
    if (!selectedFile) return;

    try {
      setIsSearching(true);
      const payload = await searchImageByImage(selectedFile);

      if (!payload.success) {
        alert(payload.error?.message || '오류가 발생했습니다.');
        return;
      }
      if (!payload.data) {
        alert('응답 형식이 올바르지 않습니다.');
        return;
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

      if (normalizedResults.length === 0 && payload.message) {
        alert(payload.message);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : '이미지 검색 중 오류가 발생했습니다.');
      setHasSearched(false);
      setSearchResults([]);
      setSearchResponse(null);
    } finally {
      setIsSearching(false);
    }
  };

  const openMonitoringModal = (platform: string) => {
    setSelectedPlatform(platform);
    setMonitorForm({
      maxPrice: '',
      mode: 'AUTO_PAYMENT',
      maxExecutionCount: '',
      expiryYear: '',
      expiryMonth: '',
      expiryDay: '',
    });
    setIsModalOpen(true);
  };

  const handleStartMonitoring = async () => {
    if (monitoringSearchId || !searchResponse || !selectedPlatform) return;
    if (!monitorForm.maxPrice) {
      alert('최대 결제 금액을 입력해주세요.');
      return;
    }

    const searchId = searchResponse.searchId;

    try {
      setMonitoringSearchId(searchId);

      const body: {
        platform: string;
        maxPrice: number;
        mode: 'AUTO_PAYMENT' | 'ALERT_ONLY';
        maxExecutionCount?: number;
        expiredAt?: string;
      } = {
        platform: selectedPlatform,
        maxPrice: Number(monitorForm.maxPrice),
        mode: monitorForm.mode,
      };

      if (monitorForm.maxExecutionCount) {
        body.maxExecutionCount = Number(monitorForm.maxExecutionCount);
      }

      if (monitorForm.expiryYear && monitorForm.expiryMonth && monitorForm.expiryDay) {
        body.expiredAt = `${monitorForm.expiryYear}-${monitorForm.expiryMonth}-${monitorForm.expiryDay}T23:59:59`;
      }

      const res = await startImageMonitoring(searchId, body);

      if (res.success) {
        alert('모니터링이 시작되었습니다.');
        setIsModalOpen(false);
      } else {
        alert(res.error?.message || res.message || '모니터링 시작에 실패했습니다.');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : '모니터링 시작 중 오류가 발생했습니다.');
    } finally {
      setMonitoringSearchId(null);
    }
  };

  const onDrop = (acceptedFiles: File[]) => {
    const nextFile = acceptedFiles[0] ?? null;
    handleFileSelection(nextFile);
  };

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    multiple: false,
    noClick: true,
    noKeyboard: true,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    onDropAccepted: () => setIsDragging(false),
  });

  const getPlatformColor = (platform: string) => {
    const colorMap: { [key: string]: string } = {
      'naver_shopping': '#03c75a',
      'coupang': '#ff6b6b',
      'aliexpress': '#E62E04',
    };
    return colorMap[platform] || '#6366F1';
  };

  const platformMeta = (platform: string) => {
    switch (platform) {
      case 'naver_shopping':
        return { color: getPlatformColor('naver_shopping'), label: '네이버쇼핑' };
      case 'coupang':
        return { color: getPlatformColor('coupang'), label: '쿠팡' };
      case 'aliexpress':
        return { color: getPlatformColor('aliexpress'), label: '알리익스프레스' };
      default:
        return { color: getPlatformColor(platform), label: platform };
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] dark:bg-slate-950 font-sans text-[#0F172A] dark:text-slate-50 py-10 px-4 md:px-8">
      <div className="max-w-[1000px] mx-auto">
        <div className="mb-8 md:mb-12 flex items-start gap-4 md:gap-5">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#4F46E5] flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(99,102,241,0.5)] text-white shrink-0">
            <Search className="w-6 h-6 md:w-7 md:h-7" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1.5 md:mb-2">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#0F172A] dark:text-slate-50">
                이미지 검색
              </h1>
            </div>
            <p className="text-sm md:text-base text-[#475569] dark:text-slate-400 font-medium leading-relaxed">
              원하는 상품의 이미지를 업로드하면 AI가 분석하여 최저가를 찾아드립니다
            </p>
          </div>
        </div>

        {/* 이미지 업로드 영역 */}
        <Card className="bg-white dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700 rounded-[1.5rem] shadow-[0_2px_12px_rgb(15,23,42,0.04)] mb-8 overflow-hidden">
          <CardHeader className="border-b border-[#E2E8F0] dark:border-slate-700 px-6 py-5 bg-white dark:bg-slate-800">
            <CardTitle className="text-xl font-bold text-[#0F172A] dark:text-slate-50">상품 이미지 업로드</CardTitle>
            <CardDescription className="text-sm text-[#475569] dark:text-slate-400 mt-1">
              어떤 상품인지 AI가 자동으로 인식합니다
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8 bg-[#F8FAFC] dark:bg-slate-950">
            <div
              {...getRootProps()}
              className={`min-h-[380px] flex flex-col items-center justify-center border-2 border-dashed rounded-[1.5rem] p-10 md:p-14 text-center transition-all duration-300 cursor-default relative overflow-hidden ${
                isDragging 
                  ? 'border-[#6366F1] bg-[#EEF2FF] dark:border-indigo-500 dark:bg-indigo-500/10 shadow-[0_0_30px_rgba(99,102,241,0.2)]' 
                  : 'border-[#E2E8F0] bg-[#F8FAFC] dark:bg-slate-900 dark:border-slate-700 hover:border-[#6366F1]/40 dark:hover:border-indigo-400/50 hover:bg-white dark:hover:bg-slate-800'
              }`}
            >
              {isDragging && (
                <div className="absolute inset-0 bg-[#6366F1]/5 backdrop-blur-[2px] z-10 flex items-center justify-center border-4 border-[#6366F1] rounded-[1.5rem] shadow-[inset_0_0_20px_rgba(99,102,241,0.3)] pointer-events-none">
                  <div className="bg-white dark:bg-slate-800 px-6 py-3 rounded-2xl shadow-lg flex items-center gap-3 animate-bounce">
                    <Upload className="w-6 h-6 text-[#6366F1] dark:text-indigo-400" />
                    <span className="text-[#6366F1] dark:text-indigo-400 font-bold text-lg">이미지를 놓으면 파일이 선택됩니다</span>
                  </div>
                </div>
              )}
              <input {...getInputProps()} />
              {previewUrl ? (
                <div className="mx-auto mb-6 max-w-xs relative group">
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                    <span className="text-white font-medium text-sm flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      이미지 변경하기
                    </span>
                  </div>
                  <img
                    src={previewUrl}
                    alt="선택한 상품 미리보기"
                    className="mx-auto max-h-64 w-full rounded-xl border border-[#E2E8F0] dark:border-slate-700 object-contain bg-white dark:bg-slate-800 shadow-sm"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 bg-[#EEF2FF] dark:bg-indigo-500/10 text-[#6366F1] dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-[#6366F1]/10">
                  <ImageIcon className="w-10 h-10" />
                </div>
              )}
              <p className="text-[#0F172A] dark:text-slate-50 font-bold mb-6 text-lg">
                {selectedFile ? selectedFile.name : '상품 이미지를 이곳에 드래그하거나 클릭하세요'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button 
                  className="bg-white dark:bg-slate-800 text-[#0F172A] dark:text-slate-50 border border-[#E2E8F0] dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 shadow-sm rounded-xl px-6 cursor-pointer" 
                  type="button" 
                  onClick={(e) => { e.stopPropagation(); open(); }}
                >
                  <Upload className="w-4 h-4 mr-2 text-[#475569] dark:text-slate-400" />
                  파일 선택
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleFileSelection(null); }}
                  disabled={!selectedFile || isSearching}
                  className="border-[#E2E8F0] dark:border-slate-700 text-[#475569] dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 bg-white dark:bg-slate-800 rounded-xl px-6 cursor-pointer disabled:cursor-default"
                >
                  <X className="w-4 h-4 mr-2" />
                  초기화
                </Button>
              </div>
              <p className="text-[#475569] dark:text-slate-400 text-xs mt-6 font-medium">
                JPEG, PNG, WEBP 지원 · 최대 10MB
              </p>
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                className="bg-gradient-to-r from-[#6366F1] dark:from-indigo-500 to-[#4F46E5] dark:to-indigo-600 text-white hover:from-[#4F46E5] dark:hover:from-indigo-400 hover:to-[#4338CA] dark:hover:to-indigo-500 shadow-[0_4px_14px_rgba(99,102,241,0.25)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.4)] transition-all duration-300 border-none rounded-xl px-8 h-12 text-base font-bold w-full sm:w-auto"
                onClick={handleSearch}
                disabled={uploadDisabled}
              >
                <Search className="w-5 h-5 mr-2" />
                {isSearching ? '분석 중...' : '이미지 검색 시작'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI 인식 결과 (검색 후에만 표시 또는 로딩 중 스켈레톤) */}
        {isSearching ? (
          <Card className="bg-white dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700 rounded-[1.5rem] shadow-[0_2px_12px_rgb(15,23,42,0.04)] mb-8 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#6366F1] to-[#4F46E5] animate-pulse"></div>
            <CardHeader className="px-6 py-5 border-b border-[#E2E8F0] dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                <div className="h-6 w-28 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
              </div>
            </CardHeader>
            <CardContent className="p-6 bg-[#F8FAFC] dark:bg-slate-950">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-[#E2E8F0] dark:border-slate-700 h-[88px] flex flex-col justify-center shadow-sm">
                    <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded mb-2.5 animate-pulse"></div>
                    <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : hasSearched && (
          <Card className="bg-gradient-to-br from-white to-indigo-50/50 dark:from-slate-800 dark:to-indigo-950/30 border-[#E2E8F0] dark:border-slate-700 rounded-[1.5rem] shadow-[0_0_30px_rgba(99,102,241,0.1)] dark:shadow-[0_0_30px_rgba(99,102,241,0.15)] mb-8 overflow-hidden relative animate-in fade-in zoom-in-95 duration-500">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#6366F1] to-[#4F46E5]"></div>
            <CardHeader className="px-6 py-5 border-b border-[#E2E8F0] dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] dark:bg-indigo-500/10 text-[#6366F1] dark:text-indigo-400 flex items-center justify-center border border-[#6366F1]/10">
                  <Sparkles className="w-4 h-4" />
                </div>
                <CardTitle className="text-lg font-bold text-[#0F172A] dark:text-slate-50">AI 분석 결과</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 bg-transparent">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-[#E2E8F0] dark:border-slate-700 flex flex-col justify-center shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#6366F1] dark:text-indigo-400" />
                    <p className="text-[#475569] dark:text-slate-400 text-xs font-bold uppercase tracking-wider">브랜드</p>
                  </div>
                  <p className="text-[#0F172A] dark:text-slate-50 font-extrabold text-lg">{aiResult.brand || '-'}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-[#E2E8F0] dark:border-slate-700 flex flex-col justify-center shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Box className="w-3.5 h-3.5 text-[#6366F1] dark:text-indigo-400" />
                    <p className="text-[#475569] dark:text-slate-400 text-xs font-bold uppercase tracking-wider">모델</p>
                  </div>
                  <p className="text-[#0F172A] dark:text-slate-50 font-extrabold text-lg truncate" title={aiResult.model || '-'}>{aiResult.model || '-'}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-[#E2E8F0] dark:border-slate-700 flex flex-col justify-center shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Folder className="w-3.5 h-3.5 text-[#6366F1] dark:text-indigo-400" />
                    <p className="text-[#475569] dark:text-slate-400 text-xs font-bold uppercase tracking-wider">카테고리</p>
                  </div>
                  <p className="text-[#0F172A] dark:text-slate-50 font-extrabold text-lg">{aiResult.category || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 쇼핑몰 검색 결과 (항상 표시 또는 로딩 중 스켈레톤) */}
        {isSearching ? (
          <Card className="bg-white dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700 rounded-[1.5rem] shadow-[0_2px_12px_rgb(15,23,42,0.04)] mb-8 overflow-hidden">
            <CardHeader className="px-6 py-5 border-b border-[#E2E8F0] dark:border-slate-700 flex flex-row items-center justify-between">
              <div className="space-y-2">
                <div className="h-6 w-36 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                <div className="h-4 w-60 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
              </div>
              <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse"></div>
            </CardHeader>
            <CardContent className="p-0 bg-[#F8FAFC] dark:bg-slate-950">
              <div className="divide-y divide-[#E2E8F0] dark:divide-slate-700/50">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 w-full">
                        <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded mb-3 animate-pulse"></div>
                        <div className="h-6 w-3/4 max-w-[300px] bg-slate-200 dark:bg-slate-700 rounded mb-2 animate-pulse"></div>
                        <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                        <div className="h-12 w-full sm:w-28 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse"></div>
                        <div className="h-12 w-full sm:w-32 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700 rounded-[1.5rem] shadow-[0_2px_12px_rgb(15,23,42,0.04)] mb-8 overflow-hidden animate-in fade-in duration-500">
            <CardHeader className="px-6 py-5 border-b border-[#E2E8F0] dark:border-slate-700 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-[#0F172A] dark:text-slate-50 mb-1">쇼핑몰 검색 결과</CardTitle>
                <CardDescription className="text-sm text-[#475569] dark:text-slate-400">
                  다양한 플랫폼에서 찾은 상품의 가격 정보입니다
                </CardDescription>
              </div>
              <Badge variant="secondary" className="bg-[#F1F5F9] dark:bg-slate-900 text-[#0F172A] dark:text-slate-50 hover:bg-[#F1F5F9] dark:hover:bg-slate-900 border-none font-semibold rounded-md px-3 py-1 text-xs">
                총 {searchResults.length}건
              </Badge>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 bg-[#F8FAFC] dark:bg-slate-950">
              {searchResults.length === 0 ? (
                <div className="p-12 text-center text-[#475569] dark:text-slate-400 flex flex-col items-center">
                  <Search className="w-8 h-8 mb-3 opacity-20" />
                  <p className="font-medium">검색 결과가 없습니다.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchResults.map((result, index) => {
                    const isLowestPrice = result.price === Math.min(...searchResults.filter(r => r.currency === result.currency).map(r => r.price)) && searchResults.filter(r => r.currency === result.currency).length > 1;
                    return (
                      <div 
                        key={`${result.platform}-${index}`} 
                        className="p-4 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-2xl transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 fill-mode-both hover:shadow-lg hover:border-[#6366F1]/30 dark:hover:border-indigo-400/30"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="flex gap-4">
                          {/* 상품 썸네일 */}
                          <div className="w-[76px] h-[76px] rounded-xl overflow-hidden shrink-0 bg-slate-50 dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 shadow-sm">
                            {result.imageUrl ? (
                              <img
                                src={result.imageUrl}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  const p = (e.target as HTMLImageElement).parentElement!;
                                  p.classList.add('flex', 'items-center', 'justify-center');
                                  p.innerHTML = '<svg class="w-6 h-6 text-[#94A3B8]" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-[#94A3B8]" />
                              </div>
                            )}
                          </div>

                          {/* 정보 */}
                          <div className="flex flex-col flex-1 min-w-0 justify-between gap-1">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge
                                  variant="outline"
                                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-md"
                                  style={{
                                    color: platformMeta(result.platform).color,
                                    borderColor: `${platformMeta(result.platform).color}33`,
                                    backgroundColor: `${platformMeta(result.platform).color}12`,
                                  }}
                                >
                                  {platformMeta(result.platform).label}
                                </Badge>
                              </div>
                              <p className="text-[#0F172A] dark:text-slate-50 font-bold text-sm line-clamp-2 leading-snug">
                                {result.productName}
                              </p>
                            </div>
                            <div className="flex flex-col gap-2">
                              <p className={`text-lg font-extrabold tracking-tight ${isLowestPrice ? 'text-[#DC2626] dark:text-[#F87171]' : 'text-[#0F172A] dark:text-slate-50'}`}>
                                {formatPrice(result.price, result.currency)}
                                {isLowestPrice && (
                                  <span className="ml-1.5 text-xs font-extrabold text-[#DC2626] dark:text-[#F87171] align-middle bg-[#FEF2F2] dark:bg-[#DC2626]/15 px-1.5 py-0.5 rounded-md">
                                    <Award className="w-3 h-3 inline mr-0.5 -mt-0.5" />
                                    최저가
                                  </span>
                                )}
                              </p>
                              <div className="flex gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-[#E2E8F0] dark:border-slate-700 text-[#475569] dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 bg-white dark:bg-slate-800 rounded-xl font-semibold h-9 px-3"
                                  asChild
                                >
                                  <a href={result.productUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center">
                                    <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                    바로가기
                                  </a>
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-9 px-3 bg-gradient-to-r from-[#6366F1] dark:from-indigo-500 to-[#4F46E5] dark:to-indigo-600 text-white hover:from-[#4F46E5] dark:hover:from-indigo-400 hover:to-[#4338CA] dark:hover:to-indigo-500 shadow-md border-none rounded-xl font-bold cursor-pointer"
                                  onClick={() => openMonitoringModal(result.platform)}
                                  disabled={monitoringSearchId !== null}
                                >
                                  {monitoringSearchId !== null ? '처리 중...' : '모니터링 시작'}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 이미지 검색 히스토리 */}
        <Card className="bg-white dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700 rounded-[1.5rem] shadow-[0_2px_12px_rgb(15,23,42,0.04)] overflow-hidden">
          <CardHeader className="px-6 py-5 border-b border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardTitle className="text-lg font-bold text-[#0F172A] dark:text-slate-50">최근 검색 이력</CardTitle>
          </CardHeader>
          <CardContent className="p-6 bg-[#F8FAFC] dark:bg-slate-950 relative group">
            <div className="absolute top-6 bottom-6 right-6 w-16 bg-gradient-to-l from-[#F8FAFC] dark:from-slate-950 to-transparent pointer-events-none z-10"></div>
            
            {/* 왼쪽 화살표 버튼 */}
            <button
              onClick={() => {
                const container = document.getElementById('history-scroll-container');
                if (container) container.scrollBy({ left: -200, behavior: 'smooth' });
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 shadow-md flex items-center justify-center text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-slate-50 hover:border-[#6366F1]/50 transition-all opacity-0 group-hover:opacity-100"
              aria-label="이전 검색 이력"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* 오른쪽 화살표 버튼 */}
            <button
              onClick={() => {
                const container = document.getElementById('history-scroll-container');
                if (container) container.scrollBy({ left: 200, behavior: 'smooth' });
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 shadow-md flex items-center justify-center text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-slate-50 hover:border-[#6366F1]/50 transition-all opacity-0 group-hover:opacity-100"
              aria-label="다음 검색 이력"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <style>{'#history-scroll-container::-webkit-scrollbar{display:none}'}</style>
            <div id="history-scroll-container" className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory relative z-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {searchHistory.length === 0 ? (
                <p className="text-sm text-[#475569] dark:text-slate-400 font-medium">최근 검색 내역이 없습니다.</p>
              ) : (
                searchHistory.map((item) => (
                  <div
                    key={item.searchId}
                    className="flex-shrink-0 w-44 p-4 border border-[#E2E8F0] dark:border-slate-700 rounded-2xl hover:border-[#6366F1]/40 dark:hover:border-indigo-400/50 hover:shadow-lg transition-all duration-300 cursor-pointer bg-white dark:bg-slate-800 group/card snap-start"
                  >
                    <div className="w-full aspect-square bg-[#F8FAFC] dark:bg-slate-900 rounded-xl flex items-center justify-center mb-3 border border-[#E2E8F0] dark:border-slate-700 text-[#94A3B8] dark:text-slate-500 group-hover/card:border-[#6366F1]/30 transition-colors">
                      <Search className="w-8 h-8 opacity-50 group-hover/card:text-[#6366F1] group-hover/card:opacity-100 transition-all" />
                    </div>
                    <p className="text-[#0F172A] dark:text-slate-50 text-sm font-bold text-center truncate mb-0.5">
                      {[item.recognizedBrand, item.recognizedModel].filter(Boolean).join(' ')}
                    </p>
                    <p className="text-[#475569] dark:text-slate-400 text-xs text-center font-medium">{item.recognizedCategory}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* 모니터링 시작 모달 */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-lg bg-white dark:bg-slate-800 rounded-3xl p-0 overflow-hidden border-[#E2E8F0] dark:border-slate-700">
            <DialogHeader className="px-6 pt-6 pb-2">
              <DialogTitle className="text-[#0F172A] dark:text-slate-50 text-xl font-bold">모니터링 시작</DialogTitle>
              <DialogDescription className="text-[#475569] dark:text-slate-400">
                선택한 상품의 모니터링 조건을 설정합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 px-6 pb-2 mt-2">
              {/* 플랫폼 */}
              <div className="space-y-2">
                <Label className="text-[#475569] dark:text-slate-400 text-sm font-semibold">플랫폼</Label>
                <div>
                  {selectedPlatform && (
                    <Badge
                      variant="outline"
                      className="pointer-events-none text-[13px] font-bold px-3 py-1 rounded-md border"
                      style={{
                        color: platformMeta(selectedPlatform).color,
                        borderColor: `${platformMeta(selectedPlatform).color}40`,
                        backgroundColor: `${platformMeta(selectedPlatform).color}15`,
                      }}
                    >
                      {platformMeta(selectedPlatform).label}
                    </Badge>
                  )}
                </div>
              </div>

              {/* 브랜드 / 모델명 */}
              <div className="space-y-2">
                <Label className="text-[#475569] dark:text-slate-400 text-sm font-semibold">제품명 (키워드)</Label>
                <div className="bg-[#F1F5F9] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-[#0F172A] dark:text-slate-50 font-bold">
                  {[aiResult.brand, aiResult.model].filter(Boolean).join(' ') || '키워드 없음'}
                </div>
              </div>

              {/* 목표가 */}
              <div className="space-y-2">
                <Label htmlFor="maxPrice" className="text-[#475569] dark:text-slate-400 text-sm font-semibold">목표가 *</Label>
                <div className="relative">
                  <Input
                    id="maxPrice"
                    type="text"
                    inputMode="numeric"
                    placeholder="예: 250,000"
                    value={monitorForm.maxPrice ? Number(monitorForm.maxPrice).toLocaleString() : ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      setMonitorForm({ ...monitorForm, maxPrice: raw });
                    }}
                    className="bg-[#F1F5F9] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 placeholder:text-[#475569] dark:placeholder:text-slate-400 focus-visible:ring-[#6366F1]/30 dark:focus-visible:ring-indigo-400/30 rounded-xl pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#475569] dark:text-slate-400 font-medium pointer-events-none">
                    원
                  </span>
                </div>
              </div>

              {/* 결제 모드 */}
              <div className="space-y-2">
                <Label className="text-[#475569] dark:text-slate-400 text-sm font-semibold">결제 모드 *</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMonitorForm({ ...monitorForm, mode: 'ALERT_ONLY' })}
                    className={
                      monitorForm.mode === 'ALERT_ONLY'
                        ? 'border-[#475569]/30 bg-[#FFFBF0] dark:bg-amber-900/20 text-[#334155] dark:text-amber-200 hover:bg-[#FFFBF0]/80 dark:hover:bg-amber-900/40 shadow-sm rounded-xl'
                        : 'border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 hover:bg-[#F1F5F9] dark:hover:bg-slate-900 rounded-xl bg-white dark:bg-slate-800'
                    }
                  >
                    알람
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMonitorForm({ ...monitorForm, mode: 'AUTO_PAYMENT' })}
                    className={
                      monitorForm.mode === 'AUTO_PAYMENT'
                        ? 'border-[#16A34A]/30 dark:border-green-500/30 bg-[#F0FDF4] dark:bg-green-900/20 text-[#166534] dark:text-green-200 hover:bg-[#F0FDF4]/80 dark:hover:bg-green-900/30 shadow-sm rounded-xl'
                        : 'border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 hover:bg-[#F1F5F9] dark:hover:bg-slate-900 rounded-xl bg-white dark:bg-slate-800'
                    }
                  >
                    자동 결제
                  </Button>
                </div>
              </div>

              {/* 최대 결제 횟수 */}
              <div className="space-y-2">
                <Label htmlFor="maxExecutionCount" className="text-[#475569] dark:text-slate-400 text-sm font-semibold">최대 결제 횟수</Label>
                <Input
                  id="maxExecutionCount"
                  type="number"
                  placeholder="미입력 시 무제한"
                  value={monitorForm.maxExecutionCount}
                  onChange={(e) => setMonitorForm({ ...monitorForm, maxExecutionCount: e.target.value })}
                  className="bg-[#F1F5F9] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 placeholder:text-[#475569] dark:placeholder:text-slate-400 focus-visible:ring-[#6366F1]/30 dark:focus-visible:ring-indigo-400/30 rounded-xl"
                />
              </div>

              {/* 만료일 */}
              <div className="space-y-2">
                <Label className="text-[#475569] dark:text-slate-400 text-sm font-semibold">모니터링 만료 날짜</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Select
                    value={monitorForm.expiryYear}
                    onValueChange={(value: string) => setMonitorForm((prev) => ({ ...prev, expiryYear: value }))}
                  >
                    <SelectTrigger className="bg-[#F1F5F9] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 focus:ring-[#6366F1]/30 dark:focus:ring-indigo-400/30 rounded-xl">
                      <SelectValue placeholder="연도" />
                    </SelectTrigger>
                    <SelectContent>
                      {getYearOptions().map((year) => (
                        <SelectItem key={year} value={year}>{year}년</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={monitorForm.expiryMonth}
                    onValueChange={(value: string) => setMonitorForm((prev) => ({ ...prev, expiryMonth: value }))}
                    disabled={!monitorForm.expiryYear}
                  >
                    <SelectTrigger className="bg-[#F1F5F9] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 focus:ring-[#6366F1]/30 dark:focus:ring-indigo-400/30 rounded-xl">
                      <SelectValue placeholder="월" />
                    </SelectTrigger>
                    <SelectContent>
                      {getMonthOptions().map((month) => (
                        <SelectItem key={month} value={month}>{month}월</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={monitorForm.expiryDay}
                    onValueChange={(value: string) => setMonitorForm((prev) => ({ ...prev, expiryDay: value }))}
                    disabled={!monitorForm.expiryMonth}
                  >
                    <SelectTrigger className="bg-[#F1F5F9] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 focus:ring-[#6366F1]/30 dark:focus:ring-indigo-400/30 rounded-xl">
                      <SelectValue placeholder="일" />
                    </SelectTrigger>
                    <SelectContent>
                      {getDayOptions().map((day) => (
                        <SelectItem key={day} value={day}>{day}일</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter className="bg-[#F1F5F9] dark:bg-slate-900 px-6 py-4 mt-4 border-t border-[#E2E8F0] dark:border-slate-700">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={monitoringSearchId !== null}
                className="rounded-xl px-6 py-2 bg-white dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700 text-[#475569] dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                취소
              </Button>
              <Button
                className="rounded-xl px-6 py-2 bg-gradient-to-r from-[#6366F1] dark:from-indigo-500 to-[#4F46E5] dark:to-indigo-600 text-white hover:from-[#4F46E5] dark:hover:from-indigo-400 hover:to-[#4338CA] dark:hover:to-indigo-500 shadow-[0_4px_10px_rgba(99,102,241,0.25)] border-none font-bold"
                onClick={handleStartMonitoring}
                disabled={monitoringSearchId !== null}
              >
                {monitoringSearchId !== null ? '처리 중...' : '모니터링 시작'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 하단 여백 추가용 빈 div */}
        <div className="h-10"></div>
      </div>
    </div>
  );
}
