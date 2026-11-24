import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const zoom = 2;

export function Magnifier({ onClose }) {
  const lens = useRef(null);
  const canvas = useRef(null);
  const position = useRef(null);
  const drag = useRef(null);
  const place = useRef(() => {});

  useEffect(() => {
    const source = document.getElementById('root');
    let frame;
    let needsCopy = true;
    let radius;
    let positioned = [];

    function layout() {
      radius = Math.min(112, (window.innerWidth - 24) / 2, (window.innerHeight - 24) / 2);
      const point = position.current ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      position.current = {
        x: Math.max(radius + 8, Math.min(window.innerWidth - radius - 8, point.x)),
        y: Math.max(radius + 8, Math.min(window.innerHeight - radius - 8, point.y)),
      };
      const { x, y } = position.current;
      const bounds = source.getBoundingClientRect();
      lens.current.style.width = `${radius * 2}px`;
      lens.current.style.height = `${radius * 2}px`;
      lens.current.style.left = `${x - radius}px`;
      lens.current.style.top = `${y - radius}px`;
      canvas.current.style.width = `${bounds.width}px`;
      canvas.current.style.transform = `translate(${radius + (bounds.left - x) * zoom}px, ${radius + (bounds.top - y) * zoom}px) scale(${zoom})`;
      // Sticky/fixed elements (such as quiz timers) must mirror their visible
      // viewport position rather than their original place in document flow.
      positioned.forEach(([original, replica]) => {
        replica.style.translate = 'none';
        const live = original.getBoundingClientRect();
        const copied = replica.getBoundingClientRect();
        replica.style.translate = `${(x + (live.left - x) * zoom - copied.left) / zoom}px ${(y + (live.top - y) * zoom - copied.top) / zoom}px`;
      });
    }

    function copyPage() {
      // A noninteractive DOM copy keeps text (including niqqud), images and
      // responsive layout sharp without taking screenshots or using a canvas.
      const copy = source.cloneNode(true);
      copy.removeAttribute('id');
      copy.querySelectorAll('[id], [name], [autofocus]').forEach(element => {
        element.removeAttribute('id');
        // Separate cloned radios from the real quiz's radio group.
        element.removeAttribute('name');
        element.removeAttribute('autofocus');
      });
      const originals = source.querySelectorAll('*');
      const replicas = copy.querySelectorAll('*');
      positioned = [];
      originals.forEach((element, index) => {
        const replica = replicas[index];
        if (element instanceof HTMLInputElement) {
          replica.checked = element.checked;
          replica.value = element.type === 'password' ? '' : element.value;
        } else if (element instanceof HTMLSelectElement) {
          replica.selectedIndex = element.selectedIndex;
        }
        const style = getComputedStyle(element);
        if (style.position === 'sticky' || style.position === 'fixed') positioned.push([element, replica]);
        if (element.getAnimations().length) replica.style.transform = style.transform;
      });
      canvas.current.replaceChildren(copy);
      originals.forEach((element, index) => {
        if (element.scrollTop || element.scrollLeft) {
          replicas[index].scrollTop = element.scrollTop;
          replicas[index].scrollLeft = element.scrollLeft;
        }
      });
      canvas.current.style.background = getComputedStyle(document.body).background;
    }

    function schedule(copy = false) {
      needsCopy ||= copy;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        if (needsCopy) {
          needsCopy = false;
          copyPage();
        }
        layout();
      });
    }
    place.current = () => schedule();
    const mutations = new MutationObserver(() => schedule(true));
    mutations.observe(source, { subtree: true, childList: true, characterData: true, attributes: true });
    const resize = new ResizeObserver(() => schedule(true));
    resize.observe(source);
    const onResize = () => schedule(true);
    const onScroll = event => {
      if (!(event.target instanceof Node) || !lens.current.contains(event.target)) schedule(event.target !== document);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    copyPage();
    needsCopy = false;
    layout();
    lens.current.focus({ preventScroll: true });
    return () => {
      mutations.disconnect();
      resize.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
      cancelAnimationFrame(frame);
      place.current = () => {};
    };
  }, []);

  function startDrag(event) {
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX - position.current.x, y: event.clientY - position.current.y };
    event.currentTarget.dataset.dragging = 'true';
  }

  function moveDrag(event) {
    if (drag.current?.id !== event.pointerId) return;
    position.current = { x: event.clientX - drag.current.x, y: event.clientY - drag.current.y };
    place.current();
  }

  function stopDrag(event) {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    delete event.currentTarget.dataset.dragging;
  }

  function keyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!delta) return;
    event.preventDefault();
    const step = event.shiftKey ? 40 : 12;
    position.current = { x: position.current.x + delta[0] * step, y: position.current.y + delta[1] * step };
    place.current();
  }

  return createPortal(<div ref={lens} className="magnifier" tabIndex={0} role="group"
    aria-label="זכוכית מגדלת. גררו להזזה, או השתמשו במקשי החצים. Escape לסגירה."
    onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={stopDrag}
    onPointerCancel={stopDrag} onLostPointerCapture={stopDrag} onKeyDown={keyDown}>
    <div className="magnifier-viewport" aria-hidden="true" inert>
      <div ref={canvas} className="magnifier-canvas" />
    </div>
    <span className="magnifier-rim" aria-hidden="true" />
    <span className="magnifier-reflection" aria-hidden="true" />
    <span className="magnifier-handle" aria-hidden="true" />
    <span className="magnifier-badge" aria-hidden="true">×2</span>
  </div>, document.body);
}
