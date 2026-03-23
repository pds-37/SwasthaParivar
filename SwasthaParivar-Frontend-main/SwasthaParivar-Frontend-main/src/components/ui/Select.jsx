import React from "react";
import clsx from "clsx";
import "./Select.css";

const Select = React.forwardRef(
  (
    {
      label,
      helperText,
      error,
      leftIcon,
      rightSlot,
      className,
      wrapperClassName,
      children,
      disabled = false,
      ...props
    },
    ref
  ) => (
    <label className={clsx("ui-field", wrapperClassName)}>
      {label ? <span className="ui-field__label">{label}</span> : null}
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
        <select ref={ref} className="ui-field__select" disabled={disabled} {...props}>
          {children}
        </select>
        {rightSlot ? <span className="ui-field__action">{rightSlot}</span> : null}
      </span>
      {error ? <span className="ui-field__error">{error}</span> : null}
      {!error && helperText ? <span className="ui-field__helper">{helperText}</span> : null}
    </label>
  )
);

Select.displayName = "Select";

export default Select;
