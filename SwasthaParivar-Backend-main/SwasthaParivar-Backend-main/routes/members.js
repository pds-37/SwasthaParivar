import express from "express";
import FamilyMember from "../models/familymembermodel.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const members = await FamilyMember.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json(members);
  } catch (err) {
    console.error("Fetch members error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, age, gender, avatar } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Name required" });
    }

    const member = await FamilyMember.create({
      user: req.userId,
      name: name.trim(),
      age: Number.isFinite(Number(age)) ? Number(age) : 0,
      gender: gender || "other",
      avatar,
      health: {},
    });

    res.status(201).json(member);
  } catch (err) {
    console.error("Create member error:", err);
    res.status(500).json({ message: "Failed to create member" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const member = await FamilyMember.findOne({
      _id: req.params.id,
      user: req.userId,
    });

    if (!member) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json(member);
  } catch (err) {
    console.error("Fetch member error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    if (!req.body.health) {
      return res.status(400).json({ error: "Missing health object" });
    }

    const member = await FamilyMember.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { $set: { health: req.body.health } },
      { new: true, runValidators: true }
    );

    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    res.json(member);
  } catch (err) {
    console.error("Update member error:", err);
    res.status(500).json({ error: "Error updating member" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const member = await FamilyMember.findOneAndDelete({
      _id: req.params.id,
      user: req.userId,
    });

    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    res.json({ success: true, id: req.params.id });
  } catch (err) {
    console.error("Delete member error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
