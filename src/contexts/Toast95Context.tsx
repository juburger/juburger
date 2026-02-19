import React, { createContext, useContext, type ReactNode } from 'react';
import { useToast95 } from '@/hooks/useToast95';

interface ToastContextType {
  showToast: (msg: string, ok?: boolean) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast95Context = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast95Context must be inside Toast95Provider');
  return ctx;
};

export const Toast95Provider = ({ children }: { children: ReactNode }) => {
  const { message, isError, visible, showToast } = useToast95();

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className={`win-toast ${visible ? 'show' : ''} ${isError ? 'error' : ''}`}>
        {message}
      </div>
    </ToastContext.Provider>
  );
};
