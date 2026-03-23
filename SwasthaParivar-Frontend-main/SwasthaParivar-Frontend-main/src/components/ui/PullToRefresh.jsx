import React, { useRef, useState } from "react";
import clsx from "clsx";
import "./PullToRefresh.css";

const THRESHOLD = 72;
const MAX_PULL = 108;

const PullToRefresh = ({ children, onRefresh, className, disabled = false }) => {
  const containerRef = useRef(null);
  const startYRef = useRef(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const reset = () => {
    startYRef.current = null;
    setPullDistance(0);
  };

  const handleTouchStart = (event) => {
    if (disabled || refreshing) return;
    if ((containerRef.current?.scrollTop || 0) > 0) return;
    startYRef.current = event.touches[0]?.clientY ?? null;
  };

  const handleTouchMove = (event) => {
    if (disabled || refreshing || startYRef.current === null) return;
    if ((containerRef.current?.scrollTop || 0) > 0) {
      reset();
      return;
    }

    const currentY = event.touches[0]?.clientY ?? startYRef.current;
    const delta = currentY - startYRef.current;

    if (delta <= 0) {
      setPullDistance(0);
      return;
    }

    const nextDistance = Math.min(MAX_PULL, delta * 0.45);
    setPullDistance(nextDistance);

    if (event.cancelable) {
      event.preventDefault();
    }
  };

  const handleTouchEnd = async () => {
    if (disabled || refreshing || startYRef.current === null) {
      reset();
      return;
    }

    const shouldRefresh = pullDistance >= THRESHOLD;
    startYRef.current = null;

    if (!shouldRefresh) {
      setPullDistance(0);
      return;
    }

    setRefreshing(true);
    setPullDistance(THRESHOLD);

    try {
      await onRefresh?.();
    } finally {
      setRefreshing(false);
      setPullDistance(0);
    }
  };

  return (
    <div
      ref={containerRef}
      className={clsx("pull-refresh", className, {
        "is-refreshing": refreshing,
        "is-pulling": pullDistance > 0,
      })}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={reset}
    >
      <div className="pull-refresh__indicator" style={{ height: `${pullDistance}px` }}>
        <div className="pull-refresh__chip">
          <span className="pull-refresh__spinner" aria-hidden="true" />
          <span>{refreshing ? "Refreshing..." : pullDistance >= THRESHOLD ? "Release to refresh" : "Pull to refresh"}</span>
        </div>
      </div>
      <div className="pull-refresh__content" style={{ transform: `translateY(${pullDistance}px)` }}>
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
