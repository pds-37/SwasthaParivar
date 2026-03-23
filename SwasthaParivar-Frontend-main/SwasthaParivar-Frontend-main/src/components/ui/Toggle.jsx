import React from "react";
import clsx from "clsx";
import "./Toggle.css";

const Toggle = React.forwardRef(
  ({ label, helperText, className, ...props }, ref) => (
    <label className={clsx("ui-toggle", className)}>
      <input ref={ref} type="checkbox" className="ui-toggle__input" {...props} />
      <span className="ui-toggle__track" aria-hidden="true" />
      <span className="ui-check__content">
        <span className="ui-check__label">{label}</span>
        {helperText ? <span className="ui-check__helper">{helperText}</span> : null}
      </span>
    </label>
  )
);

Toggle.displayName = "Toggle";

export default Toggle;
