import React, { useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import "./Toast.css";

const icons = {
  success: <CheckCircle2 size={18} />,
  error: <AlertCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <Info size={18} />,
};

const SWIPE_THRESHOLD = 72;

const Toast = ({ id, type = "info", title, description }) => {
  const startXRef = useRef(null);
  const [offsetX, setOffsetX] = useState(0);

  const handleTouchStart = (event) => {
    startXRef.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchMove = (event) => {
    if (startXRef.current === null) return;
    const currentX = event.touches[0]?.clientX ?? startXRef.current;
    const delta = currentX - startXRef.current;
    setOffsetX(delta);
  };

  const handleTouchEnd = () => {
    if (Math.abs(offsetX) >= SWIPE_THRESHOLD && id) {
      toast.dismiss(id);
    }

    startXRef.current = null;
    setOffsetX(0);
  };

  return (
    <div
      className={`ui-toast ui-toast--${type}`}
      style={{
        transform: offsetX ? `translateX(${offsetX}px)` : undefined,
        opacity: offsetX ? Math.max(0.45, 1 - Math.abs(offsetX) / 160) : undefined,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div className="ui-toast__icon">{icons[type] || icons.info}</div>
      <div>
        <div className="ui-toast__title">{title}</div>
        {description ? <div className="ui-toast__description">{description}</div> : null}
      </div>
    </div>
  );
};

export default Toast;
