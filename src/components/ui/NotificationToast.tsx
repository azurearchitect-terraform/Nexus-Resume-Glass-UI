import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { cn } from './cn';

interface NotificationToastProps {
  open: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const toneMap = {
  success: { icon: CheckCircle2, className: 'from-emerald-500/90 to-emerald-400/80' },
  error: { icon: AlertCircle, className: 'from-red-500/90 to-rose-400/80' },
  info: { icon: Info, className: 'from-blue-500/90 to-cyan-400/80' },
};

export function NotificationToast({ open, message, type, onClose }: NotificationToastProps) {
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [open, onClose]);

  const Icon = toneMap[type].icon;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          className={cn(
            'fixed bottom-4 right-4 z-[60] flex items-center gap-2 rounded-xl border border-white/15 bg-gradient-to-r px-4 py-3 text-sm font-medium text-white shadow-2xl backdrop-blur-xl',
            toneMap[type].className,
          )}
        >
          <Icon className="h-4 w-4" />
          <span>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
