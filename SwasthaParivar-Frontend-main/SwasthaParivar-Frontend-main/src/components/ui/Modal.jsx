import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import "./Modal.css";

const focusableSelector =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const MOBILE_BREAKPOINT = 768;
const DRAG_CLOSE_THRESHOLD = 120;

const Modal = ({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  size = "md",
  className,
  initialFocusRef,
}) => {
  const panelRef = useRef(null);
  const dragStartRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();
  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    const previousActive = document.activeElement;
    const panel = panelRef.current;
    const focusables = panel?.querySelectorAll(focusableSelector);
    const firstFocusable = initialFocusRef?.current || focusables?.[0] || panel;

    firstFocusable?.focus?.();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== "Tab" || !panel) return;

      const elements = Array.from(panel.querySelectorAll(focusableSelector)).filter(
        (node) => !node.hasAttribute("disabled")
      );

      if (!elements.length) return;

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      setDragOffset(0);
      dragStartRef.current = null;
      previousActive?.focus?.();
    };
  }, [initialFocusRef, open]);

  const isMobileViewport = () =>
    typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT;

  const handleDragStart = (event) => {
    if (!isMobileViewport()) return;
    dragStartRef.current = event.touches[0]?.clientY ?? null;
  };

  const handleDragMove = (event) => {
    if (!isMobileViewport() || dragStartRef.current === null) return;

    const currentY = event.touches[0]?.clientY ?? dragStartRef.current;
    const delta = Math.max(0, currentY - dragStartRef.current);
    setDragOffset(delta);

    if (delta > 0 && event.cancelable) {
      event.preventDefault();
    }
  };

  const handleDragEnd = () => {
    if (dragStartRef.current === null) return;

    const shouldClose = dragOffset >= DRAG_CLOSE_THRESHOLD;
    dragStartRef.current = null;

    if (shouldClose) {
      onCloseRef.current?.();
      setDragOffset(0);
      return;
    }

    setDragOffset(0);
  };

  if (!open) return null;

  return createPortal(
    <div className="ui-modal-root" role="presentation">
      <div className="ui-modal-backdrop" onClick={() => onCloseRef.current?.()} />
      <div
        ref={panelRef}
        className={clsx("ui-modal-panel", `ui-modal-panel--${size}`, className, {
          "is-dragging": dragOffset > 0,
        })}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        style={{
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          transition: dragOffset > 0 ? "none" : undefined,
        }}
      >
        <div
          className="ui-modal-drag-region"
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          onTouchCancel={handleDragEnd}
        >
          <span className="ui-modal-handle" aria-hidden="true" />
          {(title || description) && (
            <div className="ui-modal-header">
              <div>
                {title ? (
                  <h2 id={titleId} className="ui-modal-title">
                    {title}
                  </h2>
                ) : null}
                {description ? (
                  <p id={descriptionId} className="ui-modal-description">
                    {description}
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </div>
        <div className="ui-modal-body">{children}</div>
        {footer ? <div className="ui-modal-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
