import React from 'react';
import { GlassCard } from './GlassCard';
import { cn } from './cn';

export function TimelineCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <GlassCard className={cn('p-4', className)} {...props} />;
}
