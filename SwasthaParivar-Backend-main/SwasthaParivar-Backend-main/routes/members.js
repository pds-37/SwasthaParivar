import express from "express";
import familyMemberController from "../controllers/FamilyMemberController.js";
import { validate } from "../middleware/validate.js";
import {
  createMemberSchema,
  memberListQuerySchema,
  memberParamsSchema,
  updateMemberProfileSchema,
  updateMemberHealthSchema,
} from "../validations/memberSchemas.js";

const router = express.Router();

router.get("/", validate(memberListQuerySchema, "query"), (req, res) =>
  familyMemberController.list(req, res)
);
router.post("/", validate(createMemberSchema), (req, res) => familyMemberController.create(req, res));
router.get("/:id", validate(memberParamsSchema, "params"), (req, res) =>
  familyMemberController.get(req, res)
);
router.put(
  "/:id",
  validate(memberParamsSchema, "params"),
  validate(updateMemberHealthSchema),
  (req, res) => familyMemberController.updateHealth(req, res)
);
router.patch(
  "/:id/profile",
  validate(memberParamsSchema, "params"),
  validate(updateMemberProfileSchema),
  (req, res) => familyMemberController.updateProfile(req, res)
);
router.delete("/:id", validate(memberParamsSchema, "params"), (req, res) =>
  familyMemberController.delete(req, res)
);

export default router;
