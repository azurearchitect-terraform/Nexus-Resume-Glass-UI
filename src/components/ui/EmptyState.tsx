import React from 'react';
import { GlassCard } from './GlassCard';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <GlassCard className="p-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/8 text-white/80">{icon}</div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      {description && <p className="mt-1 text-sm text-white/60">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </GlassCard>
  );
}
