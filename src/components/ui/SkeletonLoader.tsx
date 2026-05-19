import React from 'react';
import { cn } from './cn';

export function SkeletonLoader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-xl bg-white/10', className)} {...props} />;
}
