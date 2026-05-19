import React from 'react';
import { cn } from './cn';

export const GlassInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function GlassInput({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'min-h-11 w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/40 backdrop-blur-xl outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20',
          className,
        )}
        {...props}
      />
    );
  },
);
