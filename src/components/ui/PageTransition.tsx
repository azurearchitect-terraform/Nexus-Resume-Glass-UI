import React from 'react';
import { motion } from 'motion/react';

interface PageTransitionProps {
  children: React.ReactNode;
  transitionKey: string;
  className?: string;
}

export function PageTransition({ children, transitionKey, className }: PageTransitionProps) {
  return (
    <motion.div
      key={transitionKey}
      initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
