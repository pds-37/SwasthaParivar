import { useMemo } from "react";

import REMEDIES_DATA from "../data/remedies";

export const useRemedies = () => {
  const remedies = useMemo(() => REMEDIES_DATA, []);

  return {
    remedies,
    loading: false,
    error: null,
  };
};

export default useRemedies;
