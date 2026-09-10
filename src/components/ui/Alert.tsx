import type { ComponentProps } from 'react';

/** An inline message box. Pass role="status" for notices that need not interrupt. */
export type AlertTone = 'default' | 'destructive' | 'success' | 'warning';

const tones: Record<AlertTone, string> = {
  default: 'border-line bg-surface text-ink',
  destructive: 'border-loss/40 bg-loss-soft text-loss',
  success: 'border-gain/40 bg-gain-soft text-gain',
  warning: 'border-warn/40 bg-warn-soft text-warn',
};

interface Props extends ComponentProps<'div'> {
  tone?: AlertTone;
}

export function Alert({ tone = 'default', role = 'alert', className = '', ...props }: Props) {
  return (
    <div
      role={role}
      className={`rounded-lg border px-3 py-2 text-sm motion-safe:animate-enter ${tones[tone]} ${className}`}
      {...props}
    />
  );
}
