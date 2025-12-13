const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const auth = require("../middleware/authMiddleware");

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function generateRecurringInstances(task, startDate, endDate) {
  const instances = [];
  
  if (!task.recurring || !task.recurring.isRecurring) return instances;
  
  // Base date để tính recurring
  const baseDate = task.startDate || task.dueDate || task.createdAt;
  if (!baseDate) return instances;
  
  // Kiểm tra baseDate có hợp lệ không
  const base = new Date(baseDate);
  if (isNaN(base.getTime())) return instances;
  
  let currentDate = new Date(base);
  const now = new Date();
  
  // Tính end date cho recurring
  const endRecurring = task.recurring.endDate ? 
    new Date(task.recurring.endDate) : 
    new Date(now.getFullYear() + 10, now.getMonth(), now.getDate()); // 10 năm sau
  
  // Đảm bảo currentDate không sau endRecurring
  if (currentDate > endRecurring) return instances;
  
  // Tính tất cả instances trong khoảng thời gian
  while (currentDate <= endRecurring && currentDate <= endDate) {
    if (currentDate >= startDate) {
      // Kiểm tra xem instance này đã hoàn thành hay bị skip chưa
      const dateStr = currentDate.toISOString().split('T')[0];
      const isCompleted = task.recurring.completedDates?.some(d => {
        const dDate = d.date ? new Date(d.date).toISOString().split('T')[0] : '';
        return dDate === dateStr;
      }) || false;
      
      const isSkipped = task.recurring.skippedDates?.some(d => {
        const dDate = d.date ? new Date(d.date).toISOString().split('T')[0] : '';
        return dDate === dateStr;
      }) || false;
      
      // Tạo instance object
      const instance = JSON.parse(JSON.stringify(task)); // Deep copy
      
      // Cập nhật ID và các trường đặc biệt
      instance._id = `${task._id}_${dateStr}`;
      instance.originalTaskId = task._id;
      instance.isRecurringInstance = true;
      instance.instanceDate = new Date(currentDate);
      instance.dueDate = new Date(currentDate);
      instance.completed = isCompleted;
      instance.status = isCompleted ? 'done' : (isSkipped ? 'skipped' : task.status);
      
      // Thêm vào mảng instances
      instances.push(instance);
    }
    
    // Tính ngày tiếp theo theo pattern
    switch (task.recurring.pattern) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + (task.recurring.interval || 1));
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + 7 * (task.recurring.interval || 1));
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + (task.recurring.interval || 1));
        break;
      case 'yearly':
        currentDate.setFullYear(currentDate.getFullYear() + (task.recurring.interval || 1));
        break;
      default:
        currentDate.setDate(currentDate.getDate() + 1); // Default là daily
    }
  }
  
  return instances;
}

// ---------------- GET ALL TASKS WITH PAGINATION ----------------
router.get("/", auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const {
      status,
      priority,
      search,
      projectId,
      completed,
      includeRecurring = "false",
      timeframe = "future",
      hideOriginalRecurring = "false"
    } = req.query;

    console.log("📋 GET /tasks params:", {
      page,
      limit,
      status,
      priority,
      search,
      projectId,
      completed,
      includeRecurring,
      timeframe,
      hideOriginalRecurring
    });

    let filter = { userId: req.user.id };

    if (status) {
      if (status === "incomplete") {
        filter.status = { $ne: "done" };
      } else {
        filter.status = status;
      }
    } else if (completed !== undefined) {
      filter.completed = completed === "true";
    }

    if (priority) filter.priority = priority;
    if (projectId) filter.projectId = projectId;

    if (search && search.trim()) {
      const escaped = escapeRegex(search.trim());
      filter.$or = [
        { title: { $regex: escaped, $options: "i" } },
        { description: { $regex: escaped, $options: "i" } },
        { "tags.name": { $regex: escaped, $options: "i" } }
      ];
    }

    // ===== LẤY TASK GỐC =====
    const shouldIncludeRecurring = includeRecurring === "true";
    const shouldHideOriginalRecurring =
      hideOriginalRecurring === "true" && shouldIncludeRecurring;

    const originalTasksQuery = Task.find(filter);

    if (shouldHideOriginalRecurring) {
      originalTasksQuery.where("recurring.isRecurring").ne(true);
      console.log("🚫 Hiding original recurring tasks - using proper MongoDB query");
    }

    const originalTasks = await originalTasksQuery
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    let allTasks = [...originalTasks];

    // ===== INCLUDE RECURRING INSTANCES =====
    if (shouldIncludeRecurring) {
      console.log("🔄 Including recurring instances...");

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      let startDate, endDate;

      switch (timeframe) {
        case "past":
          startDate = new Date(2000, 0, 1);
          endDate = new Date(now);
          break;
        case "future":
          startDate = new Date(now);
          endDate = new Date(
            now.getFullYear() + 1,
            now.getMonth(),
            now.getDate()
          );
          break;
        case "all":
          startDate = new Date(2000, 0, 1);
          endDate = new Date(
            now.getFullYear() + 1,
            now.getMonth(),
            now.getDate()
          );
          break;
        default:
          startDate = new Date(now);
          endDate = new Date(
            now.getFullYear() + 1,
            now.getMonth(),
            now.getDate()
          );
      }

      const recurringFilter = {
        userId: req.user.id,
        "recurring.isRecurring": true
      };

      if (projectId) recurringFilter.projectId = projectId;

      const recurringTasks = await Task.find(recurringFilter).lean();

      for (const task of recurringTasks) {
        const instances = generateRecurringInstances(
          task,
          startDate,
          endDate
        );
        allTasks.push(...instances);
      }
    }

    // ===== SORT + PAGINATION =====
    allTasks.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    const paginatedTasks = allTasks.slice(0, limit);

    const totalTasks = allTasks.length;
    const totalPages = Math.ceil(totalTasks / limit);

    res.json({
      success: true,
      data: paginatedTasks,
      pagination: {
        page,
        limit,
        totalTasks,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      stats: {
        total: totalTasks,
        recurringInstances: allTasks.filter(t => t.isRecurringInstance).length,
        originalTasks: allTasks.filter(t => !t.isRecurringInstance).length
      }
    });
  } catch (err) {
    console.error("❌ Get tasks error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tasks",
      error: err.message
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

// ---------------- UPDATE TASK - CẢI THIỆN ĐỒNG BỘ CHECKLIST ----------------
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
      current: { 
        completed: task.completed, 
        status: task.status,
        checklist: task.checklist ? `${task.checklist.filter(item => item.completed).length}/${task.checklist.length}` : 'no checklist'
      },
      update: req.body
    });

    // QUAN TRỌNG: Xử lý completed với checklist
    if (req.body.completed !== undefined) {
      const newCompleted = Boolean(req.body.completed);
      
      // Nếu đánh dấu hoàn thành task
      if (newCompleted === true) {
        task.completed = true;
        task.status = "done";
        
        // QUAN TRỌNG: Đánh dấu tất cả checklist items hoàn thành
        if (task.checklist && task.checklist.length > 0) {
          task.checklist = task.checklist.map(item => ({
            ...item,
            completed: true,
            completedAt: item.completed ? item.completedAt : new Date()
          }));
          console.log("✅ Đã đánh dấu tất cả checklist items hoàn thành");
        }
        
        task.notified = true;
      } 
      // Nếu bỏ hoàn thành task
      else if (newCompleted === false) {
        task.completed = false;
        task.status = "todo";
        task.notified = false;
        
        // QUAN TRỌNG: Bỏ đánh dấu tất cả checklist items (tuỳ chọn)
        // Giữ nguyên trạng thái checklist để user có thể tick lại từng item
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
        
        // QUAN TRỌNG: Đánh dấu tất cả checklist items hoàn thành
        if (task.checklist && task.checklist.length > 0) {
          task.checklist = task.checklist.map(item => ({
            ...item,
            completed: true,
            completedAt: item.completed ? item.completedAt : new Date()
          }));
          console.log("✅ Đã đánh dấu tất cả checklist items hoàn thành khi status = done");
        }
      } else if (task.completed === true) {
        // Nếu status không phải "done" nhưng task đang completed, reset completed
        task.completed = false;
      }
    }

    // Update title
    if (req.body.title !== undefined) {
      const title = String(req.body.title).trim();
      if (!title) {
        return res.status(400).json({ success: false, message: "Title empty" });
      }
      task.title = title;
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
      status: task.status,
      checklist: task.checklist ? task.checklist.map(item => ({ 
        text: item.text, 
        completed: item.completed 
      })) : []
    });

    const updated = await task.save();
    
    console.log("✅ Task updated successfully:", {
      id: updated._id,
      title: updated.title,
      completed: updated.completed,
      status: updated.status,
      checklistProgress: updated.checklist ? 
        `${updated.checklist.filter(item => item.completed).length}/${updated.checklist.length}` : 
        'no checklist'
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