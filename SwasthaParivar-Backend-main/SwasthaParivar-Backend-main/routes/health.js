import express from "express";
import HealthRecord from "../models/healthrecord.js";

const router = express.Router();

// Add record
router.post("/:memberId", async (req, res) => {
  try {
    const record = new HealthRecord({
      memberId: req.params.memberId,
      date: req.body.date,
      bloodPressure: req.body.bloodPressure,
      heartRate: req.body.heartRate,
      bloodSugar: req.body.bloodSugar,
      weight: req.body.weight,
      sleep: req.body.sleep,
      steps: req.body.steps,
    });

    await record.save();
    res.json({ success: true });
  } catch (err) {
    console.log("ADD RECORD ERROR:", err);
    res.status(500).json({ error: "Failed to save record" });
  }
});

// Get records
router.get("/:memberId", async (req, res) => {
  try {
    const records = await HealthRecord.find({
      memberId: req.params.memberId,
    }).sort({ date: -1 });

    res.json(records);
  } catch (err) {
    console.log("FETCH RECORD ERROR:", err);
    res.status(500).json({ error: "Failed to load records" });
  }
});

export default router;
