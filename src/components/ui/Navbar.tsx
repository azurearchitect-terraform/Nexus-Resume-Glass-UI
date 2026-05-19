import React from 'react';
import { cn } from './cn';

export function Navbar({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 border-b border-white/10 bg-black/35 backdrop-blur-2xl supports-[backdrop-filter]:bg-black/30',
        className,
      )}
      {...props}
    />
  );
}
