import { type ReactNode, useEffect } from 'react';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: ReactNode;
}

const IcoX = () => (
  <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: '1.1rem', height: '1.1rem' }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function Modal({ open, title, onClose, children, size = 'md', footer }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!open) return null;

  const widthClass = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size];

  return (
    <div className="modal modal-open">
      <div className={`modal-box ${widthClass} w-full p-0 overflow-hidden flex flex-col max-h-[90vh]`}>

        {/* Header — dark teal chrome matching AMSWebKey */}
        <div
          style={{
            background: 'var(--ent-dark)',
            color: 'white',
            padding: '0.375rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <h3
            style={{
              fontWeight: 600,
              fontSize: '0.9rem',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '0.25rem 0.375rem',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '0.25rem',
              opacity: 0.85,
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
          >
            <IcoX />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {/* Footer — shown only when footer prop is provided */}
        {footer && (
          <div
            style={{
              borderTop: '1px solid var(--color-base-200, #e5e7eb)',
              padding: '0.5rem 1rem',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.5rem',
              flexShrink: 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
