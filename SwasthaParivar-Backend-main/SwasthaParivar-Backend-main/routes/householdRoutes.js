import express from "express";

import householdController from "../controllers/HouseholdController.js";
import { validate } from "../middleware/validate.js";
import {
  acceptInviteSchema,
  createInviteSchema,
} from "../validations/householdSchemas.js";

const router = express.Router();

router.get("/me", (req, res) => householdController.getCurrent(req, res));
router.post("/invitations", validate(createInviteSchema), (req, res) =>
  householdController.createInvite(req, res)
);
router.post("/invitations/accept", validate(acceptInviteSchema), (req, res) =>
  householdController.acceptInvite(req, res)
);

export default router;
