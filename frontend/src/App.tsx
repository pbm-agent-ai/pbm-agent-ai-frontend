import { lazy, Suspense, useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { LogoIcon } from '@/components/ui/LogoIcon';

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

// ── Layout + 로딩 바 ──
function AppLayout() {
  return (
    <>
      <RouteLoadingBar />
      <Layout />
    </>
  );
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
        <Route path="/login" element={<Suspense fallback={<PageLoading />}><Login /></Suspense>} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Suspense fallback={<PageLoading />}><Dashboard /></Suspense>} />
          <Route path="/conditions" element={<Suspense fallback={<PageLoading />}><Conditions /></Suspense>} />
          <Route path="/price-history" element={<Suspense fallback={<PageLoading />}><PriceHistory /></Suspense>} />
          <Route path="/recommendations" element={<Suspense fallback={<PageLoading />}><Recommendation /></Suspense>} />
          <Route path="/payments" element={<Suspense fallback={<PageLoading />}><Payments /></Suspense>} />
          <Route path="/settings" element={<Suspense fallback={<PageLoading />}><Settings /></Suspense>} />
        </Route>
        <Route path="/" element={<Suspense fallback={<PageLoading />}><Landing /></Suspense>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
