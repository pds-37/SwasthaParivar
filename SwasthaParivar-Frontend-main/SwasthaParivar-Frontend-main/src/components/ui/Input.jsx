import React from "react";
import clsx from "clsx";
import "./Input.css";

const Input = React.forwardRef(
  (
    {
      label,
      helperText,
      error,
      leftIcon,
      rightSlot,
      className,
      wrapperClassName,
      disabled = false,
      ...props
    },
    ref
  ) => (
    <label className={clsx("ui-field", wrapperClassName)}>
      {label ? (
        <span className="ui-field__label-row">
          <span className="ui-field__label">{label}</span>
        </span>
      ) : null}
      <span
        className={clsx(
          "ui-field__control",
          leftIcon && "has-left-icon",
          rightSlot && "has-right-slot",
          disabled && "is-disabled",
          error && "is-error",
          className
        )}
      >
        {leftIcon ? <span className="ui-field__icon">{leftIcon}</span> : null}
        <input ref={ref} className="ui-field__input" disabled={disabled} {...props} />
        {rightSlot ? <span className="ui-field__action">{rightSlot}</span> : null}
      </span>
      {error ? <span className="ui-field__error">{error}</span> : null}
      {!error && helperText ? <span className="ui-field__helper">{helperText}</span> : null}
    </label>
  )
);

Input.displayName = "Input";

export default Input;
