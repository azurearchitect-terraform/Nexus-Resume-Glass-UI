import React from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost';

interface GlassButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd'> {
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  primary: 'bg-gradient-to-r from-cyan-400/90 to-violet-500/90 text-white border-white/20 hover:brightness-110 shadow-[0_10px_30px_rgba(56,189,248,0.35)]',
  secondary: 'bg-white/10 text-white border-white/20 hover:bg-white/15',
  ghost: 'bg-transparent text-white/80 border-white/10 hover:bg-white/10 hover:text-white',
};

export const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(function GlassButton(
  { className, variant = 'secondary', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition-all hover:-translate-y-px active:translate-y-0 disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
});
