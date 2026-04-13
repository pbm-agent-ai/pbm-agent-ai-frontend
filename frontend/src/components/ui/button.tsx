import React from "react";
import clsx from "clsx";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline";
};

export function Button({
  className,
  variant = "default",
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "px-4 py-2 rounded-md font-semibold transition",
        variant === "default" &&
          "bg-emerald-500 text-white hover:bg-emerald-600",
        variant === "outline" &&
          "border border-slate-300 text-slate-600 hover:bg-slate-100",
        className
      )}
      {...props}
    />
  );
}