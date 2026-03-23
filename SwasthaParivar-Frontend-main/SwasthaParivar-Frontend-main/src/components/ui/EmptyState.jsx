import React from "react";
import Button from "./Button";
import "./EmptyState.css";

const EmptyState = ({ icon, heading, description, ctaLabel, onCta }) => (
  <div className="ui-empty-state">
    {icon ? <div className="ui-empty-state__icon">{icon}</div> : null}
    <div className="ui-empty-state__heading">{heading}</div>
    <div className="ui-empty-state__description">{description}</div>
    {ctaLabel && onCta ? (
      <Button variant="primary" onClick={onCta}>
        {ctaLabel}
      </Button>
    ) : null}
  </div>
);

export default EmptyState;
