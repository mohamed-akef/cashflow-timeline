/**
 * Shared control styles so every form looks the same and stays compact.
 * Widths are set at the call site to fit the content (an amount is ~8
 * characters, a month picker ~10), never stretched to the container.
 */
export const input =
  'rounded border border-line-strong bg-surface px-2 py-1 text-sm transition-colors focus:border-accent focus:outline-none';
export const fieldLabel = 'mb-0.5 block text-xs font-medium text-ink-muted';
export const btnPrimary =
  'rounded bg-accent px-3 py-1 text-sm text-on-accent transition-colors hover:bg-accent-hover';
export const btnSecondary =
  'rounded border border-line-strong bg-surface px-3 py-1 text-sm transition-colors hover:bg-surface-muted';
export const btnGhost = 'rounded px-3 py-1 text-sm text-ink-muted transition-colors hover:bg-surface-muted';
/** A checkbox/radio chip: the input is visually hidden, the span is the chip. */
export const chip =
  'cursor-pointer select-none rounded-full border border-line-strong px-2.5 py-0.5 text-xs transition-colors ' +
  'peer-checked:border-accent peer-checked:bg-accent peer-checked:text-on-accent ' +
  'peer-focus-visible:ring-2 peer-focus-visible:ring-accent/50 hover:bg-surface-muted';
