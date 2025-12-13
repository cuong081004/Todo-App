const mongoose = require("mongoose");

const goalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Goal title is required"],
      trim: true,
      maxlength: [200, "Goal title cannot exceed 200 characters"],
    },
    target: {
      type: Number,
      required: true,
      min: 1,
    },
    current: {
      type: Number,
      default: 0,
      min: 0,
    },
    type: {
      type: String,
      enum: [
        "monthly_tasks",
        "weekly_tasks",
        "overdue_rate",
        "streak",
        "completion_rate",
        "custom",
      ],
      default: "custom",
    },
    period: {
      type: String,
      enum: ["daily", "weekly", "monthly", "yearly", "ongoing"],
      default: "monthly",
    },
    completed: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtuals
goalSchema.virtual("progress").get(function () {
  return (this.current / this.target) * 100;
});

goalSchema.virtual("isAchieved").get(function () {
  return this.current >= this.target;
});

// Indexes
goalSchema.index({ userId: 1, createdAt: -1 });
goalSchema.index({ userId: 1, completed: 1 });
goalSchema.index({ userId: 1, type: 1 });

module.exports = mongoose.model("Goal", goalSchema);