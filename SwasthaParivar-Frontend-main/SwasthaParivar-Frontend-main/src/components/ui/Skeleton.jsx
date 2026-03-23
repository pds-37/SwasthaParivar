import React from "react";
import clsx from "clsx";
import "./Skeleton.css";

const Skeleton = ({ variant = "rect", width = "100%", height, className }) => (
  <span className={clsx("ui-skeleton", `ui-skeleton--${variant}`, className)} style={{ width, height }} />
);

export default Skeleton;
