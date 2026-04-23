import * as React from 'react';

type AlertDialogContextValue = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
};

const AlertDialogContext = React.createContext<AlertDialogContextValue | null>(null);

function AlertDialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return <AlertDialogContext.Provider value={{ open, onOpenChange }}>{children}</AlertDialogContext.Provider>;
}

function AlertDialogContent({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const context = React.useContext(AlertDialogContext);

  if (!context?.open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`w-full rounded-lg bg-white shadow-xl ${className}`}>{children}</div>
    </div>
  );
}

function AlertDialogHeader({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`space-y-2 px-6 pt-6 ${className}`}>{children}</div>;
}

function AlertDialogFooter({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`flex items-center justify-end gap-2 px-6 pb-6 pt-4 ${className}`}>{children}</div>;
}

function AlertDialogTitle({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <h2 className={`text-lg font-semibold ${className}`}>{children}</h2>;
}

function AlertDialogDescription({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <p className={`text-sm text-muted-foreground ${className}`}>{children}</p>;
}

function AlertDialogAction({
  className = '',
  children,
  onClick,
}: {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void | Promise<void>;
}) {
  return (
    <button type="button" className={className} onClick={onClick}>
      {children}
    </button>
  );
}

function AlertDialogCancel({
  className = '',
  children,
  onClick,
}: {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const context = React.useContext(AlertDialogContext);

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        onClick?.();
        context?.onOpenChange?.(false);
      }}
    >
      {children}
    </button>
  );
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
};