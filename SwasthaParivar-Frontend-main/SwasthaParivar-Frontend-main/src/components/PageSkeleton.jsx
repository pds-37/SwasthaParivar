import React from "react";

import { Skeleton } from "./ui";
import "./PageSkeleton.css";

const PageSkeleton = () => (
  <div className="page-skeleton">
    <Skeleton variant="card" />
    <div className="page-skeleton__grid">
      <Skeleton variant="card" />
      <Skeleton variant="card" />
    </div>
    <Skeleton variant="card" />
  </div>
);

export default PageSkeleton;
