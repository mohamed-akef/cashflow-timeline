import type { ReactNode } from 'react';

interface Props {
  /** id of the heading that names the dialog. */
  labelledBy: string;
  /** Long dialogs sit at the top so they can scroll; short ones centre. */
  align?: 'center' | 'top';
  size?: 'md' | 'lg';
  /** Clicking the backdrop dismisses when given. */
  onDismiss?: () => void;
  children: ReactNode;
}

/** A dimmed backdrop with an elevated panel. Compose the panel from CardHeader / CardContent / CardFooter. */
export function Dialog({ labelledBy, align = 'center', size = 'md', onDismiss, children }: Props) {
  return (
    <div
      className={`fixed inset-0 z-30 flex justify-center overflow-y-auto bg-black/40 p-4 dark:bg-black/60 motion-safe:animate-fade ${align === 'top' ? 'items-start' : 'items-center'}`}
      onClick={onDismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(e) => e.stopPropagation()}
        className={`w-full rounded-xl border border-line bg-surface text-ink shadow-xl motion-safe:animate-pop ${size === 'lg' ? 'max-w-2xl' : 'max-w-lg'}`}
      >
        {children}
      </div>
    </div>
  );
}
