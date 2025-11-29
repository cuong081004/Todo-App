// backend/routes/pushRoutes.js
const express = require("express");
const router = express.Router();
const Subscription = require("../models/Subscription");
const webpush = require("../webpush");
const auth = require("../middleware/authMiddleware");

// GET public VAPID key (frontend sẽ lấy để subscribe)
router.get("/public-key", (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY || "";
  if (!key) return res.status(500).json({ success: false, message: "VAPID_PUBLIC_KEY not configured" });
  res.json({ key });
});

// Save subscription for authenticated user
router.post("/subscribe", auth, async (req, res) => {
  try {
    const subscription = req.body.subscription || req.body; // support both shapes
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ success: false, message: "Invalid subscription object" });
    }

    // Upsert by userId (replace previous subscription)
    await Subscription.findOneAndUpdate(
      { userId: req.user.id },
      { subscription },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, message: "Subscribed" });
  } catch (err) {
    console.error("Subscribe error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Send push to a specific user (requires auth)
router.post("/notify", auth, async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;
    if (!userId || !title) return res.status(400).json({ success: false, message: "userId and title required" });

    const subs = await Subscription.find({ userId });
    if (!subs || subs.length === 0) return res.status(200).json({ success: true, message: "No subscriptions for user" });

    const payload = JSON.stringify({ title, body: body || "", data: data || {} });

    const results = await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(s.subscription, payload);
          return { ok: true };
        } catch (err) {
          console.warn("Failed push to subscription:", err && err.statusCode, err && err.body);
          return { ok: false, error: err?.message || err };
        }
      })
    );

    res.json({ success: true, results });
  } catch (err) {
    console.error("Notify error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Optional: remove subscription (logout / unsubscribe)
router.post("/unsubscribe", auth, async (req, res) => {
  try {
    await Subscription.findOneAndDelete({ userId: req.user.id });
    res.json({ success: true, message: "Unsubscribed" });
  } catch (err) {
    console.error("Unsubscribe error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
