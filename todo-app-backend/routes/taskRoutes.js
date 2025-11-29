//D:\to-do app\todo-app-backend\routes\taskRoutes.js
const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const auth = require("../middleware/authMiddleware");

// ---------------- GET ALL TASKS ----------------
router.get("/", auth, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: tasks.length,
      data: tasks,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch tasks",
    });
  }
});

// ---------------- CREATE TASK ----------------
router.post("/", auth, async (req, res) => {
  try {
    let { title, dueDate, tags } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: "Title required" });
    }

    if (dueDate) {
      const date = new Date(dueDate);
      if (isNaN(date)) {
        return res.status(400).json({ success: false, message: "Invalid date" });
      }
      dueDate = date;
    }

    if (Array.isArray(tags)) {
      tags = tags.filter(tag => tag.name?.trim());
    } else {
      tags = [];
    }

    const task = new Task({
      title: title.trim(),
      dueDate,
      tags,
      userId: req.user.id,
      notified: false   // 🔥 đảm bảo cron sẽ gửi thông báo
    });

    const newTask = await task.save();

    res.status(201).json({ success: true, data: newTask });

  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to create task" });
  }
});

// ---------------- UPDATE TASK ----------------
router.patch("/:id", auth, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    // --- Update title ---
    if (req.body.title !== undefined) {
      const title = req.body.title.trim();
      if (!title) {
        return res.status(400).json({ success: false, message: "Title empty" });
      }
      task.title = title;
    }

    // --- Update completed ---
    if (req.body.completed !== undefined) {
      const newCompleted = Boolean(req.body.completed);

      // Nếu chuyển từ completed → incomplete
      // thì phải reset notified để cron có thể nhắc lại
      if (task.completed === true && newCompleted === false) {
        task.notified = false;
      }

      task.completed = newCompleted;
    }

    // --- Update tags ---
    if (req.body.tags !== undefined) {
      task.tags = Array.isArray(req.body.tags)
        ? req.body.tags.filter(tag => tag.name?.trim())
        : [];
    }

    // --- Update dueDate ---
    if (req.body.dueDate !== undefined) {
      if (req.body.dueDate === null) {
        task.dueDate = null;
        task.notified = false;    // 🔥 reset vì ngày đã thay đổi
      } else {
        const date = new Date(req.body.dueDate);
        if (isNaN(date)) {
          return res.status(400).json({ success: false, message: "Invalid date" });
        }

        // Nếu thay đổi ngày thì reset notified
        if (!task.dueDate || task.dueDate.getTime() !== date.getTime()) {
          task.notified = false; // 🔥 cực kỳ quan trọng
        }

        task.dueDate = date;
      }
    }

    const updated = await task.save();
    res.json({ success: true, data: updated });

  } catch (err) {
    res.status(500).json({ success: false, message: "Update failed" });
  }
});

// ---------------- DELETE TASK ----------------
router.delete("/:id", auth, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    res.json({ success: true, message: "Task deleted" });

  } catch (err) {
    res.status(500).json({ success: false, message: "Delete failed" });
  }
});

module.exports = router;
