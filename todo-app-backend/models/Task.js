const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: { 
      type: String, 
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Task title cannot exceed 200 characters']
    },
    completed: { 
      type: Boolean, 
      default: false,
      index: true 
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    dueDate: { 
      type: Date, 
      default: null,
      index: true
    },
    tags: [
      {
        name: { 
          type: String, 
          required: true,
          trim: true,
          maxlength: 50
        },
        color: { 
          type: String, 
          default: "#74b9ff",
          validate: {
            validator: function(v) {
              return /^#[0-9A-F]{6}$/i.test(v);
            },
            message: props => `${props.value} is not a valid hex color!`
          }
        }
      }
    ],
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for checking if task is overdue
taskSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate || this.completed) return false;
  return new Date() > this.dueDate;
});

// Index for efficient queries
taskSchema.index({ userId: 1, createdAt: -1 });
taskSchema.index({ userId: 1, completed: 1 });
taskSchema.index({ userId: 1, dueDate: 1 });

module.exports = mongoose.model("Task", taskSchema);