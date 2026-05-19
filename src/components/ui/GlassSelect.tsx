import React from 'react';
import { cn } from './cn';

export const GlassSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function GlassSelect({ className, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          'min-h-11 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20',
          className,
        )}
        {...props}
      />
    );
  },
);
