import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
  {
    variants: {
      variant: {
        default:     'bg-[var(--color-primary)] text-[var(--color-primary-content)] border-transparent',
        success:     'bg-[color-mix(in_oklch,var(--color-success)_15%,transparent)] text-[var(--color-success)] border-[color-mix(in_oklch,var(--color-success)_30%,transparent)]',
        destructive: 'bg-[color-mix(in_oklch,var(--color-error)_15%,transparent)] text-[var(--color-error)] border-[color-mix(in_oklch,var(--color-error)_30%,transparent)]',
        warning:     'bg-[color-mix(in_oklch,var(--color-warning)_15%,transparent)] text-[var(--color-warning)] border-[color-mix(in_oklch,var(--color-warning)_30%,transparent)]',
        info:        'bg-[color-mix(in_oklch,var(--color-info)_15%,transparent)] text-[var(--color-info)] border-[color-mix(in_oklch,var(--color-info)_30%,transparent)]',
        outline:     'bg-transparent border-current',
        soft:        'bg-[color-mix(in_oklch,var(--color-primary)_15%,transparent)] text-[var(--color-primary)] border-[color-mix(in_oklch,var(--color-primary)_30%,transparent)]',
      },
      size: {
        default: 'text-xs px-2 py-0.5',
        sm:      'text-[0.7rem] px-1.5 py-0.5',
        xs:      'text-[0.6rem] px-1 py-px',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
