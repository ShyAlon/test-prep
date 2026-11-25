import React, { useEffect, useId, useRef } from 'react';

const buttonClasses = { primary: 'primary', text: 'text-button', utility: 'utility', plain: '' };

export function Button({ variant = 'primary', className = '', type = 'button', ...props }) {
  return (
    <button
      {...props}
      type={type}
      className={[buttonClasses[variant], className].filter(Boolean).join(' ')}
    />
  );
}

export function AppMark({ className = '' }) {
  return (
    <span aria-hidden="true" className={`app-mark ${className}`}>
      <img alt="" src="./icons/camp-bat-192.png" />
    </span>
  );
}

export function Brand({ onClick }) {
  const Tag = onClick ? Button : 'span';
  return (
    <Tag className="brand" {...(onClick ? { variant: 'plain', onClick } : {})}>
      <AppMark />
      <span>
        מחנה היצורים <small>לומדים ויוצאים להרפתקה</small>
      </span>
    </Tag>
  );
}

export function ExternalLink(props) {
  return <a {...props} target="_blank" rel="noreferrer" />;
}

export function Modal({
  title,
  eyebrow,
  subtitle,
  onClose,
  className = 'help-dialog',
  headerClassName = 'help-header',
  closeLabel = 'סגירה ✕',
  children,
}) {
  const dialog = useRef(null);
  const titleId = useId();
  useEffect(() => {
    if (!dialog.current.open) dialog.current.showModal();
  }, []);
  return (
    <dialog ref={dialog} className={className} onClose={onClose} aria-labelledby={titleId}>
      <header className={headerClassName}>
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2 id={titleId}>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <Button variant="text" autoFocus onClick={() => dialog.current.close()}>
          {closeLabel}
        </Button>
      </header>
      {children}
    </dialog>
  );
}
