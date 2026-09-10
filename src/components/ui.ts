/**
 * Shared control styles so every form looks the same and stays compact.
 * Widths are set at the call site to fit the content (an amount is ~8
 * characters, a month picker ~10), never stretched to the container.
 * Colours are semantic tokens from index.css; nothing here names a shade.
 */
const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

export const input =
  'rounded-md border border-line-strong bg-surface px-2 py-1 text-sm text-ink transition-colors ' +
  'placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25';
export const fieldLabel = 'mb-0.5 block text-xs font-medium text-ink-muted';
export const btnPrimary =
  `rounded-md bg-accent px-3 py-1 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover ${focusRing}`;
export const btnSecondary =
  'rounded-md border border-line-strong bg-surface px-3 py-1 text-sm font-medium text-ink transition-colors ' +
  `hover:border-accent hover:text-accent ${focusRing}`;
export const btnGhost =
  `rounded-md px-3 py-1 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink ${focusRing}`;
/** Destructive actions: quiet until hovered, always in the loss colour. */
export const btnDanger =
  `rounded-md px-3 py-1 text-sm font-medium text-loss transition-colors hover:bg-loss-soft ${focusRing}`;
/** A checkbox/radio chip: the input is visually hidden, the span is the chip. */
export const chip =
  'cursor-pointer select-none rounded-full border border-line-strong bg-surface px-2.5 py-0.5 text-xs font-medium transition-colors ' +
  'hover:border-accent hover:text-accent ' +
  'peer-checked:border-accent peer-checked:bg-accent peer-checked:text-on-accent peer-checked:hover:text-on-accent ' +
  'peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40';
/** A content panel on the canvas. */
export const card = 'rounded-xl border border-line bg-surface';
/** Heading of a panel or a dialog section. */
export const sectionTitle = 'text-sm font-semibold text-ink';
