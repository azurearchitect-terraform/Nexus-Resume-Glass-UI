import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './cn';

interface PremiumModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  className?: string;
  children: React.ReactNode;
}

export function PremiumModal({ open, onClose, title, className, children }: PremiumModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={onClose} aria-label="Close modal" />
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className={cn('relative z-10 w-full max-w-lg rounded-2xl border border-white/15 bg-black/55 p-6 text-white backdrop-blur-2xl', className)}
          >
            {title && <h2 className="mb-3 text-lg font-semibold">{title}</h2>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
