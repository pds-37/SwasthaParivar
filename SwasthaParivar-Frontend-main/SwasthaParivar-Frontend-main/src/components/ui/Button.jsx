import React from "react";
import clsx from "clsx";
import "./Button.css";

const Button = React.forwardRef(
  (
    {
      as: Component = "button",
      type = "button",
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const hasChildren =
      children !== undefined && children !== null && children !== false && children !== "";

    return (
      <Component
        ref={ref}
        type={Component === "button" ? type : undefined}
        className={clsx(
          "ui-button",
          `ui-button--${variant}`,
          `ui-button--${size}`,
          fullWidth && "ui-button--full",
          loading && "is-loading",
          className
        )}
        disabled={Component === "button" ? isDisabled : undefined}
        aria-disabled={Component !== "button" ? isDisabled : undefined}
        {...props}
      >
        {loading ? (
          <span className="ui-button__spinner" aria-hidden="true" />
        ) : (
          <>
            {leftIcon ? <span className="ui-button__icon">{leftIcon}</span> : null}
            {hasChildren ? <span>{children}</span> : null}
            {rightIcon ? <span className="ui-button__icon">{rightIcon}</span> : null}
          </>
        )}
      </Component>
    );
  }
);

Button.displayName = "Button";

export default Button;
