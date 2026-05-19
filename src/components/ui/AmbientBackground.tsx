import React from 'react';
import { GradientOrb } from './GradientOrb';

export function AmbientBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.18),transparent_40%),radial-gradient(circle_at_20%_80%,rgba(34,211,238,0.16),transparent_40%)]" />
      <GradientOrb className="-top-40 -left-24" sizeClassName="h-[55vw] w-[55vw]" />
      <GradientOrb className="top-1/2 -right-20" sizeClassName="h-[48vw] w-[48vw]" />
      <GradientOrb className="-bottom-24 left-1/3" sizeClassName="h-[50vw] w-[50vw]" />
      <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(rgba(255,255,255,0.7)_0.7px,transparent_0.7px)] [background-size:24px_24px]" />
    </div>
  );
}
