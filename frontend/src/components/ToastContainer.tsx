import { useToastStore, type ToastItem } from '../store/toastStore';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

const iconMap: Record<ToastItem['type'], React.ReactNode> = {
  success: <CheckCircle className="w-4 h-4 shrink-0" />,
  error: <AlertCircle className="w-4 h-4 shrink-0" />,
  warning: <AlertTriangle className="w-4 h-4 shrink-0" />,
  info: <Info className="w-4 h-4 shrink-0" />,
};

const styleMap: Record<ToastItem['type'], string> = {
  success: 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-400',
  error: 'border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-900/80 text-rose-700 dark:text-rose-400',
  warning: 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-900/80 text-amber-700 dark:text-amber-400',
  info: 'border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-900/80 text-blue-700 dark:text-blue-400',
};

const barColorMap: Record<ToastItem['type'], string> = {
  success: 'bg-emerald-400 dark:bg-emerald-500',
  error: 'bg-rose-400 dark:bg-rose-500',
  warning: 'bg-amber-400 dark:bg-amber-500',
  info: 'bg-blue-400 dark:bg-blue-500',
};

/** 토스트 지속 시간을 시각적으로 표시하는 진행 막대 애니메이션 */
const progressKeyframes = `@keyframes toast-progress { from { width: 100%; } to { width: 0%; } }`;

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  if (toasts.length === 0) return null;

  return (
    <>
      <style>{progressKeyframes}</style>
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto relative overflow-hidden rounded-xl border shadow-lg text-sm font-medium transition-all duration-300 animate-in slide-in-from-right-2 ${styleMap[t.type]}`}
        >
          <div className="flex items-center gap-2.5 px-4 py-3">
            {iconMap[t.type]}
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              onClick={() => remove(t.id)}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* 설명: 토스트 지속 시간을 시각적으로 표시하는 진행 막대 */}
          <div className={`h-0.5 w-full ${barColorMap[t.type]}`} style={{ animation: `toast-progress ${t.duration}ms linear forwards` }} />
        </div>
      ))}
    </div>
    </>
  );
}
