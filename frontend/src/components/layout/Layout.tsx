import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export default function Layout(): React.JSX.Element {
  return (
    // 2026-05-08: 공통 메뉴바를 Layout으로 고정하고, 테마 전환 시 공통 배경도 함께 반영한다.
    <div className="flex flex-col h-screen w-full bg-[#F8F9FA] dark:bg-[#020617] overflow-hidden transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 w-full overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
