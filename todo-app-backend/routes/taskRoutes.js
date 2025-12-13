const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const auth = require("../middleware/authMiddleware");

// ---------------- GET ALL TASKS WITH PAGINATION ----------------
router.get("/", auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const { status, priority, search, projectId, completed } = req.query;
    
    // Build filter
    let filter = { userId: req.user.id };
    
    // Ưu tiên: status trước, nếu không có thì dùng completed
    if (status) {
      // Xử lý filter cho "incomplete"
      if (status === 'incomplete') {
        filter.status = { $ne: 'done' };
      } else {
        filter.status = status;
      }
    } else if (completed !== undefined) {
      // Fallback: filter theo completed nếu không có status
      filter.completed = completed === 'true';
    }
    
    if (priority) filter.priority = priority;
    if (projectId) filter.projectId = projectId;
    
    // Search filter
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { "tags.name": { $regex: search, $options: "i" } }
      ];
    }
    
    // DEBUG: Log filter
    console.log("🔍 Task filter query:", {
      userId: req.user.id,
      status: status || 'none',
      completed: completed || 'none',
      filter: filter,
      params: req.query
    });
    
    // Execute queries in parallel
    const [tasks, totalTasks] = await Promise.all([
      Task.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Task.countDocuments(filter)
    ]);
    
    const totalPages = Math.ceil(totalTasks / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;
    
    // DEBUG: Log results
    console.log(`📊 Found ${tasks.length} tasks, total: ${totalTasks}`);
    if (tasks.length > 0) {
      console.log("📝 Sample task:", {
        id: tasks[0]._id,
        title: tasks[0].title,
        completed: tasks[0].completed,
        status: tasks[0].status
      });
    }
    
    res.json({
      success: true,
      data: tasks,
      pagination: {
        page,
        limit,
        totalTasks,
        totalPages,
        hasNext,
        hasPrev
      }
    });
  } catch (err) {
    console.error("Get tasks error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tasks",
    });
  }
});

// ---------------- GET TASKS FOR CALENDAR (NO PAGINATION) ----------------
router.get("/calendar", auth, async (req, res) => {
  try {
    const { month, year } = req.query;
    
    let filter = { userId: req.user.id };
    
    // Filter by month/year if provided
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      
      filter.dueDate = {
        $gte: startDate,
        $lte: endDate
      };
    }
    
    const tasks = await Task.find(filter)
      .select("title dueDate completed projectId tags status")
      .sort({ dueDate: 1 })
      .lean();
    
    res.json({
      success: true,
      data: tasks
    });
  } catch (err) {
    console.error("Get calendar tasks error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch calendar tasks",
    });
  }
});

// ---------------- CREATE TASK ----------------
router.post("/", auth, async (req, res) => {
  try {
    let { title, dueDate, tags, projectId } = req.body;

    console.log("📨 Backend received task data:", { title, dueDate, tags, projectId });

    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: "Title required" });
    }

    if (dueDate) {
      const date = new Date(dueDate);
      if (isNaN(date.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid datetime" });
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
      notified: false,
      projectId: projectId || null,
      status: "todo",
      completed: false
    });

    console.log("💾 Saving task with projectId:", task.projectId);

    const newTask = await task.save();
    console.log("✅ Task saved:", {
      id: newTask._id,
      title: newTask.title,
      status: newTask.status,
      completed: newTask.completed
    });
    
    res.status(201).json({ success: true, data: newTask });
  } catch (err) {
    console.error("Create task error:", err);
    res.status(500).json({ success: false, message: "Failed to create task" });
  }
});

// ---------------- UPDATE TASK - ĐÃ SỬA ĐỂ TỰ ĐỘNG ĐỒNG BỘ STATUS/COMPLETED ----------------
router.patch("/:id", auth, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    console.log("🔄 Updating task:", {
      id: task._id,
      current: { completed: task.completed, status: task.status },
      update: req.body
    });

    // Update title
    if (req.body.title !== undefined) {
      const title = String(req.body.title).trim();
      if (!title) {
        return res.status(400).json({ success: false, message: "Title empty" });
      }
      task.title = title;
    }

    // Update completed - TỰ ĐỘNG CẬP NHẬT STATUS
    if (req.body.completed !== undefined) {
      const newCompleted = Boolean(req.body.completed);
      
      // If toggling from completed -> incomplete, reset notified
      if (task.completed === true && newCompleted === false) {
        task.notified = false;
        task.status = "todo"; // Reset status khi bỏ completed
      }
      
      task.completed = newCompleted;
      
      // Tự động cập nhật status khi completed
      if (newCompleted === true) {
        task.status = "done";
      }
    }

    // Update status - TỰ ĐỘNG CẬP NHẬT COMPLETED
    if (req.body.status !== undefined) {
      const validStatuses = ["todo", "in_progress", "review", "done"];
      if (!validStatuses.includes(req.body.status)) {
        return res.status(400).json({ success: false, message: "Invalid status" });
      }
      
      task.status = req.body.status;
      
      // Tự động cập nhật completed dựa trên status
      if (req.body.status === "done") {
        task.completed = true;
      } else if (task.completed === true) {
        // Nếu status không phải "done" nhưng task đang completed, reset completed
        task.completed = false;
      }
    }

    // Update tags
    if (req.body.tags !== undefined) {
      task.tags = Array.isArray(req.body.tags)
        ? req.body.tags.filter(tag => tag.name?.trim())
        : [];
    }

    // Update dueDate (supports datetime string or null)
    if (req.body.dueDate !== undefined) {
      if (req.body.dueDate === null) {
        task.dueDate = null;
        task.notified = false;
      } else {
        const date = new Date(req.body.dueDate);
        if (isNaN(date.getTime())) {
          return res.status(400).json({ success: false, message: "Invalid datetime" });
        }
        // If changed, reset notified so cron will re-send when due
        if (!task.dueDate || task.dueDate.getTime() !== date.getTime()) {
          task.notified = false;
        }
        task.dueDate = date;
      }
    }

    // Update projectId
    if (req.body.projectId !== undefined) {
      task.projectId = req.body.projectId || null;
    }

    console.log("💾 Saving task update:", {
      title: task.title,
      completed: task.completed,
      status: task.status
    });

    const updated = await task.save();
    
    console.log("✅ Task updated successfully:", {
      id: updated._id,
      title: updated.title,
      completed: updated.completed,
      status: updated.status
    });
    
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Update task error:", err);
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

    console.log("🗑️ Task deleted:", task._id);
    
    res.json({ success: true, message: "Task deleted" });
  } catch (err) {
    console.error("Delete task error:", err);
    res.status(500).json({ success: false, message: "Delete failed" });
  }
});

module.exports = router;