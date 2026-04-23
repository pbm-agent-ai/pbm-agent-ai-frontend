import * as React from 'react';

type DialogContextValue = {
	open: boolean;
	onOpenChange?: (open: boolean) => void;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

function Dialog({
	open,
	onOpenChange,
	children,
}: {
	open: boolean;
	onOpenChange?: (open: boolean) => void;
	children: React.ReactNode;
}) {
	return <DialogContext.Provider value={{ open, onOpenChange }}>{children}</DialogContext.Provider>;
}

function DialogContent({
	className = '',
	children,
}: {
	className?: string;
	children: React.ReactNode;
}) {
	const context = React.useContext(DialogContext);

	if (!context?.open) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className={`w-full rounded-lg bg-white shadow-xl ${className}`}>{children}</div>
		</div>
	);
}

function DialogHeader({ className = '', children }: { className?: string; children: React.ReactNode }) {
	return <div className={`space-y-2 px-6 pt-6 ${className}`}>{children}</div>;
}

function DialogFooter({ className = '', children }: { className?: string; children: React.ReactNode }) {
	return <div className={`flex items-center justify-end gap-2 px-6 pb-6 pt-4 ${className}`}>{children}</div>;
}

function DialogTitle({ className = '', children }: { className?: string; children: React.ReactNode }) {
	return <h2 className={`text-lg font-semibold ${className}`}>{children}</h2>;
}

function DialogDescription({ className = '', children }: { className?: string; children: React.ReactNode }) {
	return <p className={`text-sm text-muted-foreground ${className}`}>{children}</p>;
}

export { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle };
