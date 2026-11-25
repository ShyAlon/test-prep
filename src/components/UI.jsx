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

export function AppMark({ className = '', theme = null }) {
  if (theme?.manifest.mark === 'ball') return <span aria-hidden="true" className={`theme-ball ${className}`}><i /></span>;
  return (
    <span aria-hidden="true" className={`app-mark ${className}`}>
      <img alt="" src={theme?.assets[theme.manifest.icon] ?? './icons/camp-bat-192.png'} />
    </span>
  );
}

export function Brand({ onClick, theme = null }) {
  const Tag = onClick ? Button : 'span';
  return (
    <Tag className="brand" {...(onClick ? { variant: 'plain', onClick } : {})}>
      <AppMark theme={theme} />
      <span>
        {theme?.manifest.brand ?? 'מחנה היצורים'} <small>{theme?.manifest.tagline ?? 'לומדים ויוצאים להרפתקה'}</small>
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
  const pressedBackdrop = useRef(false);
  function isBackdrop(event) {
    if (event.target !== event.currentTarget) return false;
    const rect = event.currentTarget.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right ||
      event.clientY < rect.top || event.clientY > rect.bottom;
  }
  useEffect(() => {
    if (!dialog.current.open) dialog.current.showModal();
  }, []);
  return (
    <dialog
      ref={dialog} className={className} onClose={onClose} aria-labelledby={titleId}
      onPointerDown={event => { pressedBackdrop.current = isBackdrop(event); }}
      onPointerCancel={() => { pressedBackdrop.current = false; }}
      onClick={event => {
        if (pressedBackdrop.current && isBackdrop(event)) dialog.current.close();
        pressedBackdrop.current = false;
      }}
    >
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
