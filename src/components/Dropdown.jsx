import React, { useEffect, useRef } from 'react';

// Shared disclosure behavior for the top-level menu and its world selector.
export function Dropdown({ ref: suppliedRef, summaryRef, summary, label, className, closeOnAction = false, children }) {
  const ownRef = useRef(null);
  const ref = suppliedRef ?? ownRef;
  useEffect(() => {
    function closeOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) ref.current.open = false;
    }
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [ref]);
  function close() {
    ref.current.open = false;
    ref.current.querySelector('summary').focus();
  }
  return <details ref={ref} className={className}
    onKeyDown={event => {
      if (event.key === 'Escape' && event.currentTarget.contains(event.target)) {
        event.preventDefault(); event.stopPropagation(); close();
      }
    }}
    onClick={event => {
      // Portal dialogs bubble through React too; only close for actions inside this menu.
      if (closeOnAction && event.currentTarget.contains(event.target) && event.target.closest('button, input[type="radio"]')) close();
    }}>
    <summary ref={summaryRef} aria-label={label}>{summary}</summary>
    {children}
  </details>;
}
