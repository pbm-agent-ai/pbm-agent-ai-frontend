import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ startY: 0, currentY: 0, isDragging: false });

  // Mount/unmount with delay for enter/exit animation
  useEffect(() => {
    if (open) {
      setMounted(true);
      // Trigger enter animation on next frame
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 250);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // ESC key close
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // ── Swipe down to dismiss ──
  const handleTouchStart = (e: React.TouchEvent) => {
    dragRef.current.startY = e.touches[0].clientY;
    dragRef.current.isDragging = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragRef.current.isDragging) return;
    const deltaY = e.touches[0].clientY - dragRef.current.startY;
    dragRef.current.currentY = deltaY;

    if (deltaY > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${deltaY}px)`;
      sheetRef.current.style.transition = 'none';
    }
  };

  const handleTouchEnd = () => {
    dragRef.current.isDragging = false;
    if (dragRef.current.currentY > 80) {
      // Swipe threshold reached → close
      onClose();
    } else if (sheetRef.current) {
      // Snap back
      sheetRef.current.style.transform = '';
      sheetRef.current.style.transition = '';
    }
    dragRef.current.currentY = 0;
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-250 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Sheet Panel */}
      <div
        ref={sheetRef}
        className={`absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-800 rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col transition-transform duration-250 ease-out will-change-transform ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-10 h-1.5 rounded-full bg-gray-300 dark:bg-slate-600" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
