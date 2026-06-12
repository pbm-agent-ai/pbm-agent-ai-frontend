import { lazy, Suspense, useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { VaultIcon as LogoIcon } from '@/components/VaultIcon';
import { useAuthStore } from '@/store/authStore';
import { fetchAuthMe } from '@/api/auth';

// ── 내비게이션 로딩 바 (location 기반) ──
function RouteLoadingBar() {
  const location = useLocation();
  const [show, setShow] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setShow(true);
    const t = setTimeout(() => setShow(false), 400);
    return () => clearTimeout(t);
  }, [location]);

  if (!show) return null;
  return <div className="fixed top-0 left-0 z-[100] w-full h-1 bg-gradient-to-r from-[#1E4D8C] via-[#0F3460] to-[#DBE2EF] animate-gradient-shift" />;
}

// ── 풀스크린 로딩 ──
function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 bg-[#1E4D8C] rounded-2xl flex items-center justify-center shadow-sm">
          <LogoIcon className="w-6 h-6 animate-spin" animated={false} />
        </div>
        <p className="text-sm font-medium text-zinc-400">로딩 중...</p>
      </div>
    </div>
  );
}

// ── Layout + 로딩 바 ──
function AppLayout() {
  return (
    <>
      <RouteLoadingBar />
      <Layout />
    </>
  );
}

/**
 * 인증 가드: localStorage에 토큰이 있으면 /auth/me로 유효성 확인 후 통과,
 * 없거나 만료됐으면 /login으로 리다이렉트.
 */
function AuthGuard({ children }: { children: React.ReactNode }) {
  // ── UI 테스트용: .env에 VITE_BYPASS_AUTH=true 설정 시 인증 생략 ──
  if (import.meta.env.VITE_BYPASS_AUTH === 'true') {
    return <>{children}</>;
  }

  const accessToken = useAuthStore((s) => s.accessToken);
  const logout      = useAuthStore((s) => s.logout);
  const [status, setStatus] = useState<'checking' | 'ok' | 'no-auth'>('checking');
  const navigate = useNavigate();

  useEffect(() => {
    // 토큰이 없으면 즉시 로그인으로
    if (!accessToken) {
      setStatus('no-auth');
      return;
    }

    // 토큰이 있으면 서버에서 유효성 확인
    fetchAuthMe()
      .then((user) => {
        if (user) {
          setStatus('ok');
        } else {
          // 토큰 만료 또는 유효하지 않음
          logout();
          setStatus('no-auth');
        }
      })
      .catch(() => {
        logout();
        setStatus('no-auth');
      });
  // 토큰 변경 시 재검증 (로그인/로그아웃 직후 반영)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    if (status === 'no-auth') {
      void navigate('/login', { replace: true });
    }
  }, [status, navigate]);

  if (status === 'checking') return <PageLoading />;
  if (status === 'no-auth')  return null;
  return <>{children}</>;
}

// ── 지연 로딩 ──
const Login = lazy(() => import('@/pages/Login'));
const Landing = lazy(() => import('@/pages/Landing'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Conditions = lazy(() => import('@/pages/Conditions'));
const PriceHistory = lazy(() => import('@/pages/PriceHistory'));
const Recommendation = lazy(() => import('@/pages/Recommendation'));
const Payments = lazy(() => import('@/pages/Payments'));
const Settings = lazy(() => import('@/pages/Settings'));

export default function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        {/* 공개 라우트 */}
        <Route path="/" element={<Suspense fallback={<PageLoading />}><Landing /></Suspense>} />
        <Route path="/login" element={<Suspense fallback={<PageLoading />}><Login /></Suspense>} />

        {/* 인증 필요 라우트 */}
        <Route element={
          <AuthGuard>
            <AppLayout />
          </AuthGuard>
        }>
          <Route path="/dashboard" element={<Suspense fallback={<PageLoading />}><Dashboard /></Suspense>} />
          <Route path="/conditions" element={<Suspense fallback={<PageLoading />}><Conditions /></Suspense>} />
          <Route path="/price-history" element={<Suspense fallback={<PageLoading />}><PriceHistory /></Suspense>} />
          <Route path="/recommendations" element={<Suspense fallback={<PageLoading />}><Recommendation /></Suspense>} />
          <Route path="/payments" element={<Suspense fallback={<PageLoading />}><Payments /></Suspense>} />
          <Route path="/settings" element={<Suspense fallback={<PageLoading />}><Settings /></Suspense>} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
