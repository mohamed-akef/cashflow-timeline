import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { currencyName, searchCurrencies } from '../domain/currencies';
import { useLocale, useT } from '../i18n';
import { Input, type ControlSize } from './ui';

interface Props {
  value: string;
  onChange: (code: string) => void;
  /** Accessible name when no visible <label> points at `id`. */
  label?: string;
  id?: string;
  size?: ControlSize;
  className?: string;
}

/**
 * A searchable currency field (ARIA combobox). Closed, it shows the code;
 * focused, it lists every currency and filters by code or name as you type.
 * Only picking an option changes the plan: stray text is dropped on blur.
 *
 * The list is position: fixed so it escapes the Setup dialog's scroll box.
 */
export function CurrencyPicker({ value, onChange, label, id, size = 'sm', className = '' }: Props) {
  const t = useT();
  const locale = useLocale();
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [box, setBox] = useState<{ top: number; start: number; width: number } | null>(null);

  const results = open ? searchCurrencies(query) : [];
  const rtl = locale === 'ar';

  // Keep the list under the field while the page or the dialog scrolls.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = input.current!.getBoundingClientRect();
      const width = Math.min(Math.max(r.width, 256), window.innerWidth - 16);
      const edge = rtl ? window.innerWidth - r.right : r.left;
      setBox({ top: r.bottom + 4, start: Math.max(8, Math.min(edge, window.innerWidth - width - 8)), width });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, rtl]);

  useLayoutEffect(() => {
    if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [open, active, listId]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };
  const pick = (code: string) => {
    if (code !== value) onChange(code);
    close();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return setOpen(true);
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (results.length ? (i + step + results.length) % results.length : 0));
    } else if (e.key === 'Enter' && open) {
      e.preventDefault();
      if (results[active]) pick(results[active]);
    } else if (e.key === 'Escape' && open) {
      // Keep the Setup dialog open: this Escape belongs to the list.
      e.stopPropagation();
      close();
      // Select the restored code so the next keystroke starts a new search.
      requestAnimationFrame(() => input.current?.select());
    }
  };

  return (
    <>
      <Input
        ref={input}
        id={id}
        size={size}
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        value={open ? query : value}
        placeholder={open ? value : undefined}
        onFocus={() => { setOpen(true); setActive(0); }}
        onClick={() => setOpen(true)}
        onBlur={close}
        onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
        onKeyDown={onKeyDown}
        className={`${open ? "" : "uppercase"} ${className}`}
      />
      {open && box && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label ?? t('currency')}
          style={{ top: box.top, insetInlineStart: box.start, width: box.width }}
          className="fixed z-40 max-h-72 overflow-y-auto rounded-lg border border-line bg-surface p-1 text-sm shadow-lg motion-safe:animate-fade"
        >
          {results.length === 0 && <li className="px-2 py-1.5 text-ink-muted">{t('noCurrency')}</li>}
          {results.map((code, i) => (
            <li
              key={code}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(code)}
              onMouseMove={() => setActive(i)}
              className={`flex cursor-pointer items-baseline gap-2 rounded-md px-2 py-1.5 ${i === active ? 'bg-accent-soft text-accent' : 'text-ink'}`}
            >
              <span className="w-10 shrink-0 font-semibold tabular-nums">{code}</span>
              <span className={`truncate ${i === active ? '' : 'text-ink-muted'}`}>{currencyName(code, locale)}</span>
              {code === value && <span className="ms-auto text-xs text-ink-faint">{t('currentCurrency')}</span>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
