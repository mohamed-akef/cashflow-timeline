/**
 * The app's few icons, drawn rather than typed: one 20px grid, one 1.75
 * stroke, round caps. Decorative by default; the control that holds an icon
 * carries the accessible name.
 */
const PATHS = {
  plus: 'M10 4.5v11M4.5 10h11',
  close: 'M5.5 5.5l9 9M14.5 5.5l-9 9',
  check: 'M4.5 10.5l3.5 3.5 7.5-8',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = 'h-4 w-4' }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={PATHS[name]} />
    </svg>
  );
}
