import React from "react";
import clsx from "clsx";
import "./Radio.css";

const Radio = React.forwardRef(
  ({ label, helperText, className, ...props }, ref) => (
    <label className={clsx("ui-check", className)}>
      <input ref={ref} type="radio" className="ui-check__box" {...props} />
      <span className="ui-check__content">
        <span className="ui-check__label">{label}</span>
        {helperText ? <span className="ui-check__helper">{helperText}</span> : null}
      </span>
    </label>
  )
);

Radio.displayName = "Radio";

export default Radio;
