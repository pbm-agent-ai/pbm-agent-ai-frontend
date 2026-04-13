import React from "react";
import clsx from "clsx";

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: DivProps) {
  return (
    <div
      className={clsx(
        "bg-white border border-slate-200 rounded-xl shadow",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: DivProps) {
  return <div className={clsx("p-4 border-b", className)} {...props} />;
}

export function CardTitle({ className, ...props }: DivProps) {
  return <h2 className={clsx("text-lg font-bold", className)} {...props} />;
}

export function CardDescription({ className, ...props }: DivProps) {
  return <p className={clsx("text-sm text-slate-500", className)} {...props} />;
}

export function CardContent({ className, ...props }: DivProps) {
  return <div className={clsx("p-4", className)} {...props} />;
}