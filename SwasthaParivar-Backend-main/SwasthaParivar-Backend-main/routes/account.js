import express from "express";
import {
  deleteUserAccountData,
  exportUserAccountData,
} from "../services/account/accountPrivacyService.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { clearAuthCookies } from "../utils/tokenCookies.js";

const router = express.Router();

router.get("/me/export", async (req, res) => {
  const payload = await exportUserAccountData(req.userId);
  if (!payload) {
    return sendError(res, {
      status: 404,
      code: "USER_NOT_FOUND",
      message: "Account not found",
    });
  }

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", 'attachment; filename="my-swasthaparivar-data.json"');

  return res.status(200).json(payload);
});

router.delete("/me", async (req, res) => {
  await deleteUserAccountData(req.userId);
  clearAuthCookies(res);

  return sendSuccess(res, {
    data: {
      message: "All your data has been permanently deleted.",
    },
  });
});

export default router;
