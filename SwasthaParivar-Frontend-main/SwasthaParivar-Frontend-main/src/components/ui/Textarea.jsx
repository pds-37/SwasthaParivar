import React from "react";
import clsx from "clsx";
import "./Textarea.css";

const Textarea = React.forwardRef(
  (
    {
      label,
      helperText,
      error,
      className,
      wrapperClassName,
      disabled = false,
      ...props
    },
    ref
  ) => (
    <label className={clsx("ui-field", wrapperClassName)}>
      {label ? <span className="ui-field__label">{label}</span> : null}
      <span className={clsx("ui-field__control", disabled && "is-disabled", error && "is-error", className)}>
        <textarea ref={ref} className="ui-field__textarea" disabled={disabled} {...props} />
      </span>
      {error ? <span className="ui-field__error">{error}</span> : null}
      {!error && helperText ? <span className="ui-field__helper">{helperText}</span> : null}
    </label>
  )
);

Textarea.displayName = "Textarea";

export default Textarea;
