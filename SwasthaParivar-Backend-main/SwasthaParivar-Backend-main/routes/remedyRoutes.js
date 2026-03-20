import express from "express";
import { generateRemedy } from "../controllers/remedyController.js";

const router = express.Router();

router.post("/generate", generateRemedy);

export default router;
