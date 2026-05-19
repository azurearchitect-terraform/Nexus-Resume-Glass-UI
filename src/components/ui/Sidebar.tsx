import React from 'react';
import { cn } from './cn';

interface SidebarProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onDrag' | 'onDragStart' | 'onDragEnd'> {
  collapsed?: boolean;
}

export function Sidebar({ className, collapsed = false, ...props }: SidebarProps) {
  return (
    <aside
      className={cn(
        'h-full rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur-xl transition-[width] duration-300',
        collapsed ? 'w-[72px]' : 'w-[280px]',
        className,
      )}
      {...props}
    />
  );
}
