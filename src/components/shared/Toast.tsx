import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue>({ addToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const TYPE_CLASS: Record<ToastType, string> = {
  success: 'alert-success',
  error:   'alert-error',
  warning: 'alert-warning',
  info:    'alert-info',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {toasts.length > 0 && (
        <div className="toast toast-end toast-bottom z-[100] max-w-sm">
          {toasts.map((t) => (
            <div key={t.id} className={`alert ${TYPE_CLASS[t.type]} shadow-lg text-sm py-2 pr-2`}>
              <span className="flex-1">{t.message}</span>
              <button
                className="btn btn-xs btn-ghost btn-circle"
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
