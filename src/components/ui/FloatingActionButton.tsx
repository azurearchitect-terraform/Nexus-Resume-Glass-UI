import React from 'react';
import { cn } from './cn';

interface FloatingActionButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd'> {
  label: string;
}

export function FloatingActionButton({ className, label, children, ...props }: FloatingActionButtonProps) {
  return (
    <button
      aria-label={label}
      className={cn(
        'fixed bottom-6 right-6 z-40 inline-flex h-12 min-w-12 items-center justify-center gap-2 rounded-full border border-cyan-300/30 bg-gradient-to-r from-cyan-400/85 to-violet-500/85 px-4 text-sm font-semibold text-white shadow-[0_15px_35px_rgba(59,130,246,0.45)] backdrop-blur-xl transition-all hover:-translate-y-0.5 active:scale-[0.98]',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
