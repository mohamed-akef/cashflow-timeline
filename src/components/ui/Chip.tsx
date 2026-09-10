import type { ComponentProps, ReactNode } from 'react';

/** A checkbox or radio drawn as a pill: the input is visually hidden, the span is the chip. */
interface Props extends Omit<ComponentProps<'input'>, 'type' | 'children'> {
  type: 'checkbox' | 'radio';
  children: ReactNode;
}

const chip =
  'cursor-pointer select-none rounded-full border border-line-strong bg-surface px-2.5 py-0.5 text-xs font-medium transition-colors ' +
  'hover:border-accent hover:text-accent ' +
  'peer-checked:border-accent peer-checked:bg-accent peer-checked:text-on-accent peer-checked:hover:text-on-accent ' +
  'peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40';

export function Chip({ children, ...props }: Props) {
  return (
    <label>
      <input className="peer sr-only" {...props} />
      <span className={chip}>{children}</span>
    </label>
  );
}
