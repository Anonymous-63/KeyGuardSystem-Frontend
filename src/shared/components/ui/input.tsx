import * as React from 'react';
import { cn } from '@/shared/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-lg border border-[var(--color-base-300)] bg-[var(--color-base-100)] px-3 text-sm text-[var(--color-base-content)] outline-none transition-[border-color,box-shadow] duration-150',
        'placeholder:text-[var(--color-base-content)] placeholder:opacity-35',
        'focus:border-[var(--color-primary)] focus:shadow-[0_0_0_2px_color-mix(in_oklch,var(--color-primary)_20%,transparent)]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        error && 'border-[var(--color-error)] focus:border-[var(--color-error)] focus:shadow-[0_0_0_2px_color-mix(in_oklch,var(--color-error)_20%,transparent)]',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
