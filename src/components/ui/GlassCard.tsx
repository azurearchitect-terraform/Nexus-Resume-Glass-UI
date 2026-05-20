import React from 'react';
import { cn } from './cn';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function GlassCard({ className, interactive = false, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/15 bg-white/[0.03] backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.25)]',
        interactive && 'transition-all duration-300 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.06]',
        className,
      )}
      {...props}
    />
  );
}
