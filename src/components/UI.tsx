import React from 'react';
import { GlassButton, NotificationToast, PremiumModal } from './ui';

export const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) => {
  return (
    <NotificationToast open message={message} type={type} onClose={onClose} />
  );
};

export const ConfirmDialog = ({ message, onConfirm, onCancel, isDarkMode }: { message: string, onConfirm: () => void, onCancel: () => void, isDarkMode: boolean }) => {
  return (
    <PremiumModal open onClose={onCancel} title="Confirm Action">
      <div className={isDarkMode ? 'text-white' : 'text-slate-900'}>
        <p className="mb-6 text-sm opacity-85">{message}</p>
        <div className="flex justify-end gap-3">
          <GlassButton variant="ghost" onClick={onCancel} className={isDarkMode ? '' : 'border-black/10 text-slate-700 hover:bg-black/5'}>
            Cancel
          </GlassButton>
          <GlassButton variant="primary" onClick={onConfirm} className="from-red-500/95 to-rose-500/90">
            Confirm
          </GlassButton>
        </div>
      </div>
    </PremiumModal>
  );
};
