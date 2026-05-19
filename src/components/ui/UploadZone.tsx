import React from 'react';
import { cn } from './cn';

interface UploadZoneProps extends Omit<React.LabelHTMLAttributes<HTMLLabelElement>, 'onDrag' | 'onDragStart' | 'onDragEnd'> {
  active?: boolean;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}

export function UploadZone({ active = false, className, children, inputProps, ...props }: UploadZoneProps) {
  return (
    <label
      className={cn(
        'flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-cyan-300/35 bg-cyan-400/[0.06] p-4 text-center text-sm text-white/80 backdrop-blur-xl transition-transform hover:-translate-y-px',
        active && 'border-cyan-300/60 bg-cyan-400/[0.12]',
        className,
      )}
      {...props}
    >
      <input className="sr-only" type="file" {...inputProps} />
      {children}
    </label>
  );
}
