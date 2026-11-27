import React from 'react';
import { Dropdown } from './Dropdown.jsx';

export function TopBarMenu({ children, triggerRef }) {
  return <Dropdown className="topbar-menu" label="תפריט" summaryRef={triggerRef} closeOnAction
    summary={<><span aria-hidden="true">☰</span> תפריט <span aria-hidden="true">⌄</span></>}>
    <nav className="topbar-menu-content" aria-label="פעולות לפי נושא">{children}</nav>
  </Dropdown>;
}

export function MenuSection({ title, children }) {
  return <details className="menu-section">
    <summary>{title}<span aria-hidden="true">⌄</span></summary>
    <div className="menu-section-items">{children}</div>
  </details>;
}
