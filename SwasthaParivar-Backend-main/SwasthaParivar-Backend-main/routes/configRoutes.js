import express from "express";

import appConfig from "../config/AppConfig.js";
import { getResolvedFlags } from "../config/featureFlags.js";
import { getEffectivePlan } from "../utils/planState.js";
import { sendSuccess } from "../utils/apiResponse.js";

const router = express.Router();

router.get("/flags", async (req, res) => {
  const plan = getEffectivePlan(req.user);

  return sendSuccess(res, {
    data: {
      plan,
      privacyPolicyVersion: appConfig.privacyPolicyVersion,
      flags: getResolvedFlags(plan),
    },
  });
});

export default router;
