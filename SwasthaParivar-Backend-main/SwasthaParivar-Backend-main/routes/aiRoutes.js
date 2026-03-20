import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import auth from "../middleware/auth.js";
import { analyzeAttachment, chatWithAI } from "../controllers/aiController.js";

const router = express.Router();

// List models
router.get("/models", async (req, res) => {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const models = await genAI.listModels();
    res.json(models);
  } catch (err) {
    console.error("MODEL LIST ERROR:", err);
    res.status(500).json({ error: "Failed to fetch models" });
  }
});

router.post("/", auth, chatWithAI);
router.post("/chat", auth, chatWithAI);
router.post("/attachments", auth, analyzeAttachment);

export default router;
