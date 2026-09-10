import type { ComponentProps } from 'react';

/** A bordered panel on the canvas. Tone tints the border and fill for status cards. */
export type CardTone = 'default' | 'gain' | 'loss';

const tones: Record<CardTone, string> = {
  default: 'border-line bg-surface',
  gain: 'border-gain/30 bg-gain-soft',
  loss: 'border-loss/30 bg-loss-soft',
};

interface CardProps extends ComponentProps<'div'> {
  tone?: CardTone;
}

export function Card({ tone = 'default', className = '', ...props }: CardProps) {
  return <div className={`rounded-lg border text-ink shadow-sm ${tones[tone]} ${className}`} {...props} />;
}

export function CardHeader({ className = '', ...props }: ComponentProps<'div'>) {
  return <div className={`flex flex-col gap-1 p-4 ${className}`} {...props} />;
}

type Heading = 'h1' | 'h2' | 'h3';
const headingSize: Record<Heading, string> = { h1: 'text-xl', h2: 'text-lg', h3: 'text-base' };

interface TitleProps extends ComponentProps<'h3'> {
  /** The heading level sets the size: h2 for a dialog or the page's main panel, h3 for a card. */
  as?: Heading;
}

export function CardTitle({ as: Tag = 'h3', className = '', ...props }: TitleProps) {
  return <Tag className={`font-semibold leading-none tracking-tight ${headingSize[Tag]} ${className}`} {...props} />;
}

export function CardDescription({ className = '', ...props }: ComponentProps<'p'>) {
  return <p className={`text-sm text-ink-muted ${className}`} {...props} />;
}

export function CardContent({ className = '', ...props }: ComponentProps<'div'>) {
  return <div className={`p-4 pt-0 ${className}`} {...props} />;
}

export function CardFooter({ className = '', ...props }: ComponentProps<'div'>) {
  return <div className={`flex items-center gap-2 p-4 pt-0 ${className}`} {...props} />;
}
