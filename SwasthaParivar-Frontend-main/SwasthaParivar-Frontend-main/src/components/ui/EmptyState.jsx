import React from "react";

import CommonEmptyState from "../common/EmptyState";

const EmptyState = ({ type, onAction, icon, heading, description, ctaLabel, onCta }) => (
  <CommonEmptyState
    type={type}
    onAction={onAction || onCta}
    icon={icon}
    title={heading}
    subtitle={description}
    actionLabel={ctaLabel}
  />
);

export default EmptyState;
