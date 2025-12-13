const mongoose = require("mongoose");

const subSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    subscription: { type: Object, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", subSchema);
