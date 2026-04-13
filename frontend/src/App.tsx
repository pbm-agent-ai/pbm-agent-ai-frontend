import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Conditions from '@/pages/Conditions';
import PriceHistory from '@/pages/PriceHistory';
import Recommendation from '@/pages/Recommendation';
import ImageSearch from '@/pages/ImageSearch';
import Payments from '@/pages/Payments';
import Settings from '@/pages/Settings';

export default function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        {/* 로그인 (레이아웃 없음) */}
        <Route path="/login" element={<Login />} />

        {/* Layout으로 감싸진 라우트 */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/conditions" element={<Conditions />} />
          <Route path="/history" element={<PriceHistory />} />
          <Route path="/recommendation" element={<Recommendation />} />
          <Route path="/image-search" element={<ImageSearch />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* 루트 → 대시보드 리다이렉트 */}
        {/* <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} /> */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* 알 수 없는 경로 → 대시보드 리다이렉트 */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
