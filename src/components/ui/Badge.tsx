import type { ComponentProps } from 'react';

/** A small status pill. Tones are the money semantics plus the accent and a quiet neutral. */
export type BadgeTone = 'accent' | 'gain' | 'loss' | 'warn' | 'neutral';

const tones: Record<BadgeTone, string> = {
  accent: 'bg-accent-soft text-accent',
  gain: 'bg-gain-soft text-gain',
  loss: 'bg-loss-soft text-loss',
  warn: 'bg-warn-soft text-warn',
  neutral: 'bg-surface-muted text-ink-muted',
};

interface Props extends ComponentProps<'span'> {
  tone?: BadgeTone;
}

export function Badge({ tone = 'neutral', className = '', ...props }: Props) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}
      {...props}
    />
  );
}
