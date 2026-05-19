import React from 'react';
import { cn } from './cn';

interface GradientOrbProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onDrag' | 'onDragStart' | 'onDragEnd'> {
  sizeClassName?: string;
}

export function GradientOrb({ className, sizeClassName = 'w-[65vw] h-[65vw]', ...props }: GradientOrbProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'absolute rounded-full bg-gradient-to-r from-cyan-400/25 via-indigo-500/15 to-fuchsia-500/20 blur-3xl animate-[liquid-float_26s_ease-in-out_infinite]',
        sizeClassName,
        className,
      )}
      {...props}
    />
  );
}
