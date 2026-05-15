import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-150 outline-none disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default:     'bg-[var(--color-primary)] text-[var(--color-primary-content)] hover:brightness-95',
        ghost:       'bg-transparent text-[var(--color-base-content)] hover:bg-[var(--color-base-200)]',
        outline:     'border border-[var(--color-base-300)] bg-transparent text-[var(--color-base-content)] hover:bg-[var(--color-base-200)]',
        destructive: 'bg-[var(--color-error)] text-[var(--color-error-content)] hover:brightness-95',
        'outline-destructive': 'border border-[var(--color-error)] bg-transparent text-[var(--color-error)] hover:bg-[var(--color-error)] hover:text-[var(--color-error-content)]',
        'outline-info':        'border border-[var(--color-info)] bg-transparent text-[var(--color-info)] hover:bg-[var(--color-info)] hover:text-[var(--color-info-content)]',
      },
      size: {
        default: 'h-10 px-4',
        sm:      'h-8 px-3 text-[0.8125rem]',
        xs:      'h-[1.6rem] px-2 text-xs',
        icon:    'h-9 w-9 p-0',
        'icon-sm': 'h-8 w-8 p-0',
        'icon-xs': 'h-[1.6rem] w-[1.6rem] p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

export { Button, buttonVariants };
