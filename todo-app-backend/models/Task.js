const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxlength: [200, "Task title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    completed: {
      type: Boolean,
      default: false,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    dueDate: {
      type: Date,
      default: null,
      index: true,
    },
    startDate: {
      type: Date,
      default: null,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },
    status: {
      type: String,
      enum: ["todo", "in_progress", "review", "done"],
      default: "todo",
      index: true,
    },
    // Trong todo-app-backend/models/Task.js
    estimatedTime: {
      value: {
        type: Number,
        default: null, // THAY ĐỔI: default thành null thay vì undefined
      },
      unit: {
        type: String,
        enum: ["minutes", "hours", "days"],
        default: "hours",
      },
    },
    actualTime: {
      value: {
        type: Number,
        default: null, // THAY ĐỔI: default thành null
      },
      unit: {
        type: String,
        enum: ["minutes", "hours", "days"],
        default: "hours",
      },
    },
    tags: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
          maxlength: 50,
        },
        color: {
          type: String,
          default: "#74b9ff",
        },
      },
    ],
    attachments: [
      {
        filename: String,
        originalName: String,
        mimetype: String,
        size: Number,
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    checklist: [
      {
        text: String,
        completed: { type: Boolean, default: false },
        completedAt: Date,
      },
    ],
    comments: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        text: String,
        createdAt: { type: Date, default: Date.now },
        updatedAt: Date,
      },
    ],
    dependencies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
    recurring: {
      isRecurring: { type: Boolean, default: false },
      pattern: {
        type: String,
        enum: ["daily", "weekly", "monthly", "yearly", "custom"],
      },
      interval: Number,
      endDate: Date,
      completedInstances: { type: Number, default: 0 },

      completedDates: [
        {
          date: Date,
          completedAt: Date,
          notes: String,
        },
      ],
      skippedDates: [
        {
          date: Date,
          skippedAt: Date,
          reason: String,
        },
      ],
      nextInstanceDate: Date, // Ngày instance tiếp theo
      lastCompletedDate: Date, // Ngày hoàn thành gần nhất
    },
    notified: { type: Boolean, default: false },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtuals
taskSchema.virtual("isOverdue").get(function () {
  if (!this.dueDate || this.completed) return false;
  return new Date() > this.dueDate;
});

taskSchema.virtual("timeSpent").get(function () {
  if (!this.actualTime || !this.actualTime.value) return 0;
  return this.actualTime.value;
});

taskSchema.virtual("progress").get(function () {
  if (this.checklist.length === 0) {
    return this.completed ? 100 : 0;
  }
  const completed = this.checklist.filter((item) => item.completed).length;
  return (completed / this.checklist.length) * 100;
});

taskSchema.virtual('nextRecurringInstance').get(function() {
  if (!this.recurring || !this.recurring.isRecurring) return null;
  
  const baseDate = this.lastCompletedDate || this.startDate || this.dueDate || this.createdAt;
  if (!baseDate) return null;
  
  const nextDate = new Date(baseDate);
  
  switch (this.recurring.pattern) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + (this.recurring.interval || 1));
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7 * (this.recurring.interval || 1));
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + (this.recurring.interval || 1));
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + (this.recurring.interval || 1));
      break;
  }
  
  // Check if next date is before endDate
  if (this.recurring.endDate && nextDate > new Date(this.recurring.endDate)) {
    return null;
  }
  
  return nextDate;
});

taskSchema.pre('save', function(next) {
  if (this.recurring && this.recurring.isRecurring) {
    this.recurring.nextInstanceDate = this.nextRecurringInstance;
  }
  next();
});
// Indexes
taskSchema.index({ userId: 1, createdAt: -1 });
taskSchema.index({ userId: 1, completed: 1 });
taskSchema.index({ userId: 1, dueDate: 1 });
taskSchema.index({ userId: 1, priority: 1 });
taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ userId: 1, projectId: 1 });

module.exports = mongoose.model("Task", taskSchema);
