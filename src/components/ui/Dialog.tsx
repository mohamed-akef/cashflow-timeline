import { useEffect, type ReactNode } from 'react';

interface Props {
  /** id of the heading that names the dialog. */
  labelledBy: string;
  /** Long dialogs sit at the top so they can scroll; short ones centre. */
  align?: 'center' | 'top';
  size?: 'md' | 'lg';
  /** Dismisses on Escape and on a backdrop click when given. */
  onDismiss?: () => void;
  children: ReactNode;
}

/**
 * A dimmed backdrop with an elevated panel. Compose the panel from
 * CardHeader / CardContent / CardFooter.
 *
 * The panel is capped to the viewport and lays its children out in a column,
 * so a caller that marks one of them `flex-1 min-h-0 overflow-y-auto` keeps
 * its header and footer in view while only that part scrolls. Without the cap
 * a long dialog pushes its own primary action off the bottom of the screen.
 */
export function Dialog({ labelledBy, align = 'center', size = 'md', onDismiss, children }: Props) {
  useEffect(() => {
    if (!onDismiss) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onDismiss]);

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
        className={`flex max-h-[calc(100dvh-2rem)] w-full flex-col rounded-xl border border-line bg-surface text-ink shadow-xl motion-safe:animate-pop ${size === 'lg' ? 'max-w-2xl' : 'max-w-lg'}`}
      >
        {children}
      </div>
    </div>
  );
}
