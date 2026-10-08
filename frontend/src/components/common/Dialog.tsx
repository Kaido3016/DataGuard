import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useI18n } from '../../i18n';
import { Icon } from './Icon';

/**
 * Modal built on the native <dialog>: focus is trapped, Escape closes it, the page behind is
 * inert, and focus returns to the opener when it closes.
 */
export function Dialog({
  open,
  onClose,
  title,
  titleId,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  titleId: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return undefined;
    const handleClose = (): void => onClose();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  return (
    <dialog ref={ref} className={`dialog${wide ? ' dialog-wide' : ''}`} aria-labelledby={titleId}>
      {open ? (
        <div className="dialog-inner">
          <header className="dialog-header">
            <h2 id={titleId} className="dialog-title">
              {title}
            </h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label={t('action.close')}>
              <Icon name="close" />
            </button>
          </header>
          <div className="dialog-body">{children}</div>
        </div>
      ) : null}
    </dialog>
  );
}
