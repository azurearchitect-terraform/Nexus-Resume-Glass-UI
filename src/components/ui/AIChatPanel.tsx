import React from 'react';
import { GlassPanel } from './GlassPanel';

interface AIChatPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  children?: React.ReactNode;
}

export function AIChatPanel({ title = 'AI Assistant', children, ...props }: AIChatPanelProps) {
  return (
    <GlassPanel className="p-4" {...props}>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-cyan-200/80">{title}</h3>
      <div className="mt-3 space-y-3">{children}</div>
    </GlassPanel>
  );
}
