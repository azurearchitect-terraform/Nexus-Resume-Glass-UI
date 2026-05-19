import React from 'react';
import { cn } from './cn';

export function GlassTable({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/35 backdrop-blur-xl">
      <table className={cn('w-full text-left text-sm text-white/85', className)} {...props} />
    </div>
  );
}
