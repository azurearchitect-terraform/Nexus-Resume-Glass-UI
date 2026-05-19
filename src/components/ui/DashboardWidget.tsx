import React from 'react';
import { GlassCard } from './GlassCard';
import { cn } from './cn';

interface DashboardWidgetProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value?: React.ReactNode;
}

export function DashboardWidget({ title, value, className, children, ...props }: DashboardWidgetProps) {
  return (
    <GlassCard className={cn('p-4', className)} interactive {...props}>
      <p className="text-xs font-semibold uppercase tracking-widest text-white/55">{title}</p>
      {value && <div className="mt-2 text-2xl font-bold text-white">{value}</div>}
      {children}
    </GlassCard>
  );
}

export function StatsCard(props: DashboardWidgetProps) {
  return <DashboardWidget {...props} />;
}
