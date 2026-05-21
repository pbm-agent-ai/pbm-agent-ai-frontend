import { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, visible, onClose, duration = 4000 }: ToastProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!visible) {
      setMounted(false);
      return;
    }

    // 약간의 지연 후 mount (enter 애니메이션용)
    const mountTimer = window.setTimeout(() => setMounted(true), 10);
    const closeTimer = window.setTimeout(() => {
      setMounted(false);
      setTimeout(onClose, 300); // fade-out 후 onClose
    }, duration);

    return () => {
      window.clearTimeout(mountTimer);
      window.clearTimeout(closeTimer);
    };
  }, [visible, duration, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed top-6 left-1/2 z-[100] -translate-x-1/2 pointer-events-none">
      <div
        className={`
          pointer-events-auto inline-flex items-center gap-2.5 px-5 py-3 rounded-xl
          border border-emerald-200 dark:border-emerald-500/30
          bg-emerald-50 dark:bg-emerald-900/80 shadow-lg
          text-sm font-medium text-emerald-700 dark:text-emerald-400
          transition-all duration-300 ease-out
          ${mounted ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0'}
        `}
      >
        <CheckCircle className="w-4 h-4 shrink-0" />
        {message}
      </div>
    </div>
  );
}
