import { useId, type ComponentProps, type ReactNode } from 'react';
import { focusRing, type ControlSize } from './Button';

/**
 * Text controls share one recipe with buttons: the size owns height and
 * padding, `className` owns width and layout only. No width is baked in;
 * inside a Field the control stretches to the field, elsewhere the caller
 * sets one.
 */
const control =
  `rounded-md border border-line-strong bg-surface text-ink shadow-sm transition-colors placeholder:text-ink-faint ${focusRing} ` +
  'focus-visible:border-accent disabled:cursor-not-allowed disabled:opacity-50';

const sizes: Record<ControlSize, string> = {
  default: 'h-9 px-3 text-sm',
  sm: 'h-8 px-2 text-sm',
  xs: 'h-6 px-1 text-xs',
};

type Sized<T> = Omit<T, 'size'> & { size?: ControlSize };

export function Input({ size = 'sm', className = '', ...props }: Sized<ComponentProps<'input'>>) {
  return <input className={`${control} ${sizes[size]} ${className}`} {...props} />;
}

export function Select({ size = 'sm', className = '', ...props }: Sized<ComponentProps<'select'>>) {
  return <select className={`${control} ${sizes[size]} ${className}`} {...props} />;
}

/** Also used on a fieldset legend, which cannot be a <label>. */
export const labelClass = 'block text-xs font-medium leading-none text-ink-muted';

export function Label({ className = '', ...props }: ComponentProps<'label'>) {
  return <label className={`${labelClass} ${className}`} {...props} />;
}

export function Hint({ className = '', ...props }: ComponentProps<'p'>) {
  return <p className={`text-xs text-ink-faint ${className}`} {...props} />;
}

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  /** Layout classes only: width, flex, grid placement. */
  className?: string;
  /**
   * A render function receives the id to put on the control, for cases where
   * the control shares its row with an adornment (a currency suffix) that must
   * stay out of the accessible label. A plain node is wrapped by the label.
   */
  children: ReactNode | ((id: string) => ReactNode);
}

/** Label above control, with an optional hint below: the one layout every form uses. */
export function Field({ label, hint, className = '', children }: FieldProps) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {typeof children === 'function' ? (
        <>
          <Label htmlFor={id}>{label}</Label>
          {children(id)}
        </>
      ) : (
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>{label}</span>
          {children}
        </label>
      )}
      {hint && <Hint>{hint}</Hint>}
    </div>
  );
}
