import type { ComponentProps } from 'react';

/**
 * shadcn-style button: the variant owns colour, the size owns height and
 * padding. `className` is for layout only (width, margin, flex), never for
 * colour or padding, so two utilities for one property never collide.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ControlSize = 'default' | 'sm' | 'xs';

export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

const base =
  `inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors ${focusRing} ` +
  'disabled:pointer-events-none disabled:opacity-50';

export const controlHeight: Record<ControlSize, string> = {
  default: 'h-9 px-4 text-sm',
  sm: 'h-8 px-3 text-sm',
  xs: 'h-6 px-1.5 text-xs',
};

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'border border-line-strong bg-surface text-ink hover:border-accent hover:text-accent',
  ghost: 'text-ink-muted hover:bg-surface-muted hover:text-ink',
  destructive: 'text-loss hover:bg-loss-soft',
};

export function buttonClass(variant: ButtonVariant = 'secondary', size: ControlSize = 'default', className = ''): string {
  return `${base} ${controlHeight[size]} ${variants[variant]} ${className}`.trim();
}

interface Props extends ComponentProps<'button'> {
  variant?: ButtonVariant;
  size?: ControlSize;
}

export function Button({ variant = 'secondary', size = 'default', className = '', type = 'button', ...props }: Props) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}
