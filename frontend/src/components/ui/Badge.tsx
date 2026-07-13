import React from "react";
import { cn } from "../../utils/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive" | "success" | "warning" | "info" | "outline";
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "default",
  children,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
  
  const variants = {
    default: "bg-red-500 text-white hover:bg-red-600",
    secondary: "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200",
    destructive: "bg-rose-600 text-white animate-pulse",
    success: "bg-emerald-500 text-white dark:bg-emerald-600/20 dark:text-emerald-400 border border-emerald-500/10",
    warning: "bg-amber-500 text-white dark:bg-amber-600/20 dark:text-amber-400 border border-amber-500/10",
    info: "bg-sky-500 text-white dark:bg-sky-600/20 dark:text-sky-400 border border-sky-500/10",
    outline: "text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800",
  };

  return (
    <span className={cn(baseStyles, variants[variant], className)} {...props}>
      {children}
    </span>
  );
};
