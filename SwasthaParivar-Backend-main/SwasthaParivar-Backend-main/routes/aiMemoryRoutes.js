import express from "express";
import auth from "../middleware/auth.js";
import AIMemory from "../models/aimemorymodel.js";

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const member = req.query.member || "Self";
    const memory = await AIMemory.findOne({ ownerId: req.userId, member });

    if (!memory) {
      return res.status(200).json({ messages: [] });
    }

    res.json({ messages: memory.messages });
  } catch (err) {
    console.error("AI Memory GET error:", err);
    res.status(500).json({ error: "Failed to load memory" });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const { member, messages } = req.body;

    if (!member || !Array.isArray(messages)) {
      return res.status(400).json({ error: "member & messages required" });
    }

    const memory = await AIMemory.findOneAndUpdate(
      { ownerId: req.userId, member },
      { $set: { messages } },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ success: true, messages: memory.messages });
  } catch (err) {
    console.error("AI Memory POST error:", err);
    res.status(500).json({ error: "Failed to save memory" });
  }
});

export default router;
