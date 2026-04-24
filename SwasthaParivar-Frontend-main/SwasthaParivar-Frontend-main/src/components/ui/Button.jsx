import React from "react";
import clsx from "clsx";
import { Link as RouterLink, useInRouterContext } from "react-router-dom";
import "./Button.css";

const resolveHref = (to) => {
  if (typeof to === "string") return to;
  if (!to || typeof to !== "object") return "#";

  const pathname = to.pathname || "";
  const search = to.search || "";
  const hash = to.hash || "";

  return `${pathname}${search}${hash}` || "#";
};

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
      onClick,
      ...props
    },
    ref
  ) => {
    const inRouterContext = useInRouterContext();
    const isDisabled = disabled || loading;
    const hasChildren =
      children !== undefined && children !== null && children !== false && children !== "";
    const isRouterLink = Component === RouterLink || Object.prototype.hasOwnProperty.call(props, "to");

    let ResolvedComponent = Component;
    const componentProps = { ...props };

    if (isRouterLink && !inRouterContext) {
      ResolvedComponent = "a";
      componentProps.href = resolveHref(componentProps.to);
      delete componentProps.to;
    }

    const handleClick = (event) => {
      if (isDisabled) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      onClick?.(event);
    };

    return (
      <ResolvedComponent
        ref={ref}
        type={ResolvedComponent === "button" ? type : undefined}
        className={clsx(
          "ui-button",
          `ui-button--${variant}`,
          `ui-button--${size}`,
          fullWidth && "ui-button--full",
          loading && "is-loading",
          className
        )}
        disabled={ResolvedComponent === "button" ? isDisabled : undefined}
        aria-disabled={ResolvedComponent !== "button" ? isDisabled : undefined}
        tabIndex={ResolvedComponent !== "button" && isDisabled ? -1 : componentProps.tabIndex}
        onClick={handleClick}
        {...componentProps}
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
      </ResolvedComponent>
    );
  }
);

Button.displayName = "Button";

export default Button;
