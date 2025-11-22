const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const auth = require("../middleware/authMiddleware");

/**
 * @route   GET /api/tasks
 * @desc    Get all tasks for logged-in user
 * @access  Private
 */
router.get("/", auth, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ 
      success: true,
      count: tasks.length,
      data: tasks 
    });
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch tasks' 
    });
  }
});

/**
 * @route   POST /api/tasks
 * @desc    Create new task
 * @access  Private
 */
router.post("/", auth, async (req, res) => {
  try {
    let { title, dueDate, tags } = req.body;

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({ 
        success: false,
        message: 'Task title is required' 
      });
    }

    if (title.length > 200) {
      return res.status(400).json({ 
        success: false,
        message: 'Task title must be less than 200 characters' 
      });
    }

    // Process due date (convert to UTC)
    if (dueDate) {
      const date = new Date(dueDate);
      if (isNaN(date.getTime())) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid date format' 
        });
      }
      dueDate = date;
    }

    // Validate tags
    if (tags && Array.isArray(tags)) {
      tags = tags.filter(tag => tag.name && tag.name.trim());
      if (tags.length > 10) {
        return res.status(400).json({ 
          success: false,
          message: 'Maximum 10 tags allowed' 
        });
      }
    }

    const task = new Task({
      title: title.trim(),
      dueDate,
      tags: tags || [],
      userId: req.user.id,
    });

    const newTask = await task.save();

    res.status(201).json({ 
      success: true,
      data: newTask 
    });
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create task' 
    });
  }
});

/**
 * @route   PATCH /api/tasks/:id
 * @desc    Update task
 * @access  Private
 */
router.patch("/:id", auth, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!task) {
      return res.status(404).json({ 
        success: false,
        message: 'Task not found' 
      });
    }

    // Update fields
    if (req.body.title !== undefined) {
      if (!req.body.title.trim()) {
        return res.status(400).json({ 
          success: false,
          message: 'Task title cannot be empty' 
        });
      }
      if (req.body.title.length > 200) {
        return res.status(400).json({ 
          success: false,
          message: 'Task title must be less than 200 characters' 
        });
      }
      task.title = req.body.title.trim();
    }

    if (req.body.completed !== undefined) {
      task.completed = Boolean(req.body.completed);
    }

    if (req.body.tags !== undefined) {
      task.tags = Array.isArray(req.body.tags) ? req.body.tags : [];
    }

    if (req.body.dueDate !== undefined) {
      if (req.body.dueDate === null) {
        task.dueDate = null;
      } else {
        const date = new Date(req.body.dueDate);
        if (isNaN(date.getTime())) {
          return res.status(400).json({ 
            success: false,
            message: 'Invalid date format' 
          });
        }
        task.dueDate = date;
      }
    }

    const updatedTask = await task.save();

    res.json({ 
      success: true,
      data: updatedTask 
    });
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update task' 
    });
  }
});

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete task
 * @access  Private
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!task) {
      return res.status(404).json({ 
        success: false,
        message: 'Task not found' 
      });
    }

    res.json({ 
      success: true,
      message: 'Task deleted successfully' 
    });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete task' 
    });
  }
});

module.exports = router;