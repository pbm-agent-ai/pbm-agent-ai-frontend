import { useConfirmDialogStore } from '../store/confirmDialogStore';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';

export default function ConfirmDialog() {
  const visible = useConfirmDialogStore((s) => s.visible);
  const options = useConfirmDialogStore((s) => s.options);
  const resolve = useConfirmDialogStore((s) => s.resolve);
  const hide = useConfirmDialogStore((s) => s._hide);

  if (!visible || !options) return null;

  const handleConfirm = () => {
    resolve?.(true);
    hide();
  };

  const handleCancel = () => {
    resolve?.(false);
    hide();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-dialog-overlay" onClick={handleCancel} />
      <div className="relative z-[151] w-full max-w-sm rounded-2xl bg-white dark:bg-slate-800 shadow-2xl animate-dialog-content overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="p-6">
          <div className="flex items-start gap-4">
            {options.icon === 'warning' ? (
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#1E4D8C]/10 dark:bg-[#7BAEDA]/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-[#1E4D8C] dark:text-[#7BAEDA]" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">{options.title}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{options.message}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 pb-6">
          {options.cancelText && (
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="rounded-xl px-5 py-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-bold"
            >
              {options.cancelText}
            </Button>
          )}
          <Button
            type="button"
            onClick={handleConfirm}
            className="rounded-xl px-5 py-2 bg-[#1E4D8C] hover:bg-[#0F3460] text-white shadow-md border-none text-sm font-bold transition-all"
          >
            {options.confirmText || '확인'}
          </Button>
        </div>
      </div>
    </div>
  );
}
