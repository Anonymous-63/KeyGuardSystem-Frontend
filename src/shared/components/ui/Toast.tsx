import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

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

const CONFIG: Record<ToastType, { border: string; bg: string; iconBg: string; iconColor: string; icon: ReactNode }> = {
  success: { border: '#16a34a', bg: '#f0fdf4', iconBg: '#dcfce7', iconColor: '#16a34a', icon: <CheckCircle   size={16} strokeWidth={2} /> },
  error:   { border: '#dc2626', bg: '#fef2f2', iconBg: '#fee2e2', iconColor: '#dc2626', icon: <XCircle       size={16} strokeWidth={2} /> },
  warning: { border: '#d97706', bg: '#fffbeb', iconBg: '#fef3c7', iconColor: '#d97706', icon: <AlertTriangle size={16} strokeWidth={2} /> },
  info:    { border: '#2563eb', bg: '#eff6ff', iconBg: '#dbeafe', iconColor: '#2563eb', icon: <Info          size={16} strokeWidth={2} /> },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const remove = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed', top: '1rem', right: '1rem',
          display: 'flex', flexDirection: 'column', gap: '0.5rem',
          zIndex: 9999, maxWidth: '360px', width: 'calc(100vw - 2rem)',
          pointerEvents: 'none',
        }}>
          {toasts.map((t) => {
            const c = CONFIG[t.type];
            return (
              <div key={t.id} style={{
                pointerEvents: 'auto',
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                background: c.bg,
                border: '1px solid rgba(0,0,0,0.08)',
                borderLeft: `4px solid ${c.border}`,
                borderRadius: '0.5rem',
                padding: '0.625rem 0.625rem 0.625rem 0.75rem',
                boxShadow: '0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
              }}>
                {/* Icon badge */}
                <span style={{
                  flexShrink: 0,
                  width: '1.75rem', height: '1.75rem',
                  borderRadius: '50%',
                  background: c.iconBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: c.iconColor,
                }}>
                  {c.icon}
                </span>

                {/* Message */}
                <span style={{
                  flex: 1,
                  fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.4,
                  color: '#111827',
                }}>
                  {t.message}
                </span>

                {/* Close */}
                <button onClick={() => remove(t.id)} style={{
                  flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '1.5rem', height: '1.5rem',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#6b7280', borderRadius: '0.25rem',
                  padding: 0,
                }}>
                  <X size={14} strokeWidth={2} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
}
