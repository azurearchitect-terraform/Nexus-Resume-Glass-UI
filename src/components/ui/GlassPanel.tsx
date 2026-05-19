import React from 'react';
import { cn } from './cn';

export function GlassPanel({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        'rounded-3xl border border-white/10 bg-black/30 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_20px_50px_rgba(0,0,0,0.35)]',
        className,
      )}
      {...props}
    />
  );
}
