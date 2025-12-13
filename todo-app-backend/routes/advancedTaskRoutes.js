const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const auth = require("../middleware/authMiddleware");

// CREATE ADVANCED TASK
router.post("/", auth, async (req, res) => {
  try {
    let {
      title,
      description,
      dueDate,
      startDate,
      priority,
      status,
      estimatedTime,
      actualTime,
      tags,
      checklist,
      recurring,
      projectId,
    } = req.body;

    console.log("📨 Backend received ADVANCED task data:", {
      title,
      estimatedTime,
      actualTime,
      tags,
      checklist,
      recurring,
    });

    if (!title?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Title required" });
    }

    // Xử lý dates
    if (dueDate) {
      const date = new Date(dueDate);
      if (isNaN(date.getTime())) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid dueDate" });
      }
      dueDate = date;
    }

    if (startDate) {
      const date = new Date(startDate);
      if (isNaN(date.getTime())) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid startDate" });
      }
      startDate = date;
    }

    // Xử lý estimatedTime
    let processedEstimatedTime = null;
    if (
      estimatedTime &&
      estimatedTime.value !== undefined &&
      estimatedTime.value !== ""
    ) {
      processedEstimatedTime = {
        value: parseInt(estimatedTime.value) || 0,
        unit: estimatedTime.unit || "hours",
      };
    }

    // Xử lý actualTime
    let processedActualTime = null;
    if (
      actualTime &&
      actualTime.value !== undefined &&
      actualTime.value !== ""
    ) {
      processedActualTime = {
        value: parseInt(actualTime.value) || 0,
        unit: actualTime.unit || "hours",
      };
    }

    // Xử lý tags
    let processedTags = [];
    if (Array.isArray(tags)) {
      processedTags = tags
        .filter((tag) => tag.name?.trim())
        .map((tag) => ({
          name: tag.name.trim(),
          color: tag.color || "#74b9ff",
        }));
    }

    // Xử lý checklist
    let processedChecklist = [];
    if (Array.isArray(checklist)) {
      processedChecklist = checklist
        .filter((item) => item.text?.trim())
        .map((item) => ({
          text: item.text.trim(),
          completed: item.completed || false,
        }));
    }

    // Xử lý recurring
    let processedRecurring = {
      isRecurring: false,
      completedInstances: 0,
    };
    if (recurring && recurring.isRecurring) {
      processedRecurring = {
        isRecurring: true,
        pattern: recurring.pattern || "weekly",
        interval: parseInt(recurring.interval) || 1,
        endDate: recurring.endDate ? new Date(recurring.endDate) : null,
        completedInstances: 0,
      };
    }

    const task = new Task({
      title: title.trim(),
      description: description?.trim() || "",
      dueDate,
      startDate,
      priority: priority || "medium",
      status: status || "todo",
      estimatedTime: processedEstimatedTime,
      actualTime: processedActualTime,
      tags: processedTags,
      checklist: processedChecklist,
      recurring: processedRecurring,
      userId: req.user.id,
      notified: false,
      projectId: projectId || null,
    });

    console.log("💾 Saving ADVANCED task with data:", {
      estimatedTime: task.estimatedTime,
      actualTime: task.actualTime,
      tags: task.tags,
      checklist: task.checklist,
      recurring: task.recurring,
    });

    const newTask = await task.save();
    console.log("✅ Advanced task saved successfully:", newTask._id);

    res.status(201).json({
      success: true,
      data: newTask,
      message: "Advanced task created successfully",
    });
  } catch (err) {
    console.error("Create advanced task error:", err);

    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: errors.join(", "),
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create advanced task",
    });
  }
});

// UPDATE ADVANCED TASK - ĐÃ CẢI THIỆN
router.patch("/:id", auth, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!task) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    console.log("🔄 Backend received UPDATE data:", req.body);

    // Update các trường cơ bản
    const updateFields = [
      "title",
      "description",
      "priority",
      "status",
      "projectId",
    ];

    updateFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === "title") {
          const title = String(req.body.title).trim();
          if (!title) {
            throw new Error("Title cannot be empty");
          }
          task.title = title;
        } else if (field === "description") {
          task.description = String(req.body.description).trim();
        } else {
          task[field] = req.body[field];
        }
      }
    });

    // Update completed status
    if (req.body.completed !== undefined) {
      const newCompleted = Boolean(req.body.completed);
      if (task.completed === true && newCompleted === false) {
        task.notified = false;
      }
      task.completed = newCompleted;
    }

    // Update dueDate với xử lý thông minh
    if (req.body.dueDate !== undefined) {
      if (req.body.dueDate === null || req.body.dueDate === "") {
        task.dueDate = null;
        task.notified = false;
      } else {
        const date = new Date(req.body.dueDate);
        if (isNaN(date.getTime())) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid dueDate" });
        }
        // Chỉ reset notified nếu dueDate thay đổi
        if (!task.dueDate || task.dueDate.getTime() !== date.getTime()) {
          task.notified = false;
        }
        task.dueDate = date;
      }
    }

    // Update startDate
    if (req.body.startDate !== undefined) {
      if (req.body.startDate === null || req.body.startDate === "") {
        task.startDate = null;
      } else {
        const date = new Date(req.body.startDate);
        if (isNaN(date.getTime())) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid startDate" });
        }
        task.startDate = date;
      }
    }

    // Update estimatedTime
    if (req.body.estimatedTime !== undefined) {
      if (req.body.estimatedTime === null) {
        task.estimatedTime = null;
      } else if (
        req.body.estimatedTime.value !== undefined &&
        req.body.estimatedTime.value !== ""
      ) {
        task.estimatedTime = {
          value: parseInt(req.body.estimatedTime.value) || 0,
          unit: req.body.estimatedTime.unit || "hours",
        };
      }
    }

    // Update actualTime
    if (req.body.actualTime !== undefined) {
      if (req.body.actualTime === null) {
        task.actualTime = null;
      } else if (
        req.body.actualTime.value !== undefined &&
        req.body.actualTime.value !== ""
      ) {
        task.actualTime = {
          value: parseInt(req.body.actualTime.value) || 0,
          unit: req.body.actualTime.unit || "hours",
        };
      }
    }

    // Update tags
    if (req.body.tags !== undefined) {
      if (Array.isArray(req.body.tags)) {
        task.tags = req.body.tags
          .filter((tag) => tag.name && tag.name.trim())
          .map((tag) => ({
            name: tag.name.trim(),
            color: tag.color || "#74b9ff",
          }));
      } else {
        task.tags = [];
      }
    }

    // Update checklist
    if (req.body.checklist !== undefined) {
      if (Array.isArray(req.body.checklist)) {
        task.checklist = req.body.checklist
          .filter((item) => item.text && item.text.trim())
          .map((item) => ({
            text: item.text.trim(),
            completed: item.completed || false,
            completedAt: item.completed
              ? item.completedAt
                ? new Date(item.completedAt)
                : new Date()
              : null,
          }));
      } else {
        task.checklist = [];
      }
    }

    // Update recurring
    if (req.body.recurring !== undefined) {
      if (req.body.recurring === null || !req.body.recurring.isRecurring) {
        task.recurring = {
          isRecurring: false,
          completedInstances: 0,
        };
      } else {
        task.recurring = {
          isRecurring: true,
          pattern: req.body.recurring.pattern || "weekly",
          interval: parseInt(req.body.recurring.interval) || 1,
          endDate: req.body.recurring.endDate
            ? new Date(req.body.recurring.endDate)
            : null,
          completedInstances:
            parseInt(req.body.recurring.completedInstances) || 0,
        };
      }
    }

    console.log("💾 Saving updated task:", {
      title: task.title,
      dueDate: task.dueDate,
      estimatedTime: task.estimatedTime,
      tags: task.tags,
    });

    const updatedTask = await task.save();

    res.json({
      success: true,
      data: updatedTask,
      message: "Task updated successfully",
    });
  } catch (err) {
    console.error("Update task error:", err);

    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: errors.join(", "),
      });
    }

    if (err.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    if (err.message === "Title cannot be empty") {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Update failed",
    });
  }
});

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET all tasks with advanced filtering
router.get("/advanced", auth, async (req, res) => {
  try {
    const {
      status,
      priority,
      projectId,
      startDate,
      endDate,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    let filter = { userId: req.user.id };

    // Add filters
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (projectId) filter.projectId = projectId;

    // Date range filter
    if (startDate || endDate) {
      filter.dueDate = {};
      if (startDate) filter.dueDate.$gte = new Date(startDate);
      if (endDate) filter.dueDate.$lte = new Date(endDate);
    }

    // Search filter
    if (search) {
      const escapedSearch = escapeRegex(search);
      filter.$or = [
        { title: { $regex: escapedSearch, $options: "i" } },
        { description: { $regex: escapedSearch, $options: "i" } },
        { "tags.name": { $regex: escapedSearch, $options: "i" } },
      ];
    }
    // Sorting
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const tasks = await Task.find(filter)
      .sort(sort)
      .populate("projectId", "name color")
      .lean();

    res.json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (err) {
    console.error("Get advanced tasks error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tasks",
    });
  }
});

// UPDATE task checklist
router.patch("/:id/checklist", auth, async (req, res) => {
  try {
    const { checklistIndex, completed } = req.body;

    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!task) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    if (!task.checklist || !task.checklist[checklistIndex]) {
      return res
        .status(400)
        .json({ success: false, message: "Checklist item not found" });
    }

    // Update checklist item
    task.checklist[checklistIndex].completed = completed;
    task.checklist[checklistIndex].completedAt = completed ? new Date() : null;

    // If all checklist items are completed, mark task as completed
    const allCompleted = task.checklist.every((item) => item.completed);
    if (allCompleted && !task.completed) {
      task.completed = true;
      task.status = "done";
    } else if (!allCompleted && task.completed) {
      task.completed = false;
      task.status = "in_progress";
    }

    const updatedTask = await task.save();

    res.json({ success: true, data: updatedTask });
  } catch (err) {
    console.error("Update checklist error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to update checklist" });
  }
});

// UPDATE task status
router.patch("/:id/status", auth, async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ["todo", "in_progress", "review", "done"];
    if (!validStatuses.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      {
        status,
        completed: status === "done" ? true : false,
      },
      { new: true, runValidators: true }
    );

    if (!task) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    res.json({ success: true, data: task });
  } catch (err) {
    console.error("Update status error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to update status" });
  }
});

// GET task statistics
router.get("/stats", auth, async (req, res) => {
  try {
    const stats = await Task.aggregate([
      { $match: { userId: req.user.id } },
      {
        $group: {
          _id: null,
          totalTasks: { $sum: 1 },
          completedTasks: { $sum: { $cond: ["$completed", 1, 0] } },
          overdueTasks: {
            $sum: {
              $cond: [
                {
                  $and: [
                    "$dueDate",
                    { $lt: ["$dueDate", new Date()] },
                    { $eq: ["$completed", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          byStatus: {
            $push: {
              status: "$status",
              count: 1,
            },
          },
          byPriority: {
            $push: {
              priority: "$priority",
              count: 1,
            },
          },
        },
      },
      {
        $project: {
          totalTasks: 1,
          completedTasks: 1,
          overdueTasks: 1,
          completionRate: {
            $multiply: [{ $divide: ["$completedTasks", "$totalTasks"] }, 100],
          },
          statusBreakdown: {
            $arrayToObject: {
              $map: {
                input: "$byStatus",
                as: "item",
                in: {
                  k: "$$item.status",
                  v: "$$item.count",
                },
              },
            },
          },
          priorityBreakdown: {
            $arrayToObject: {
              $map: {
                input: "$byPriority",
                as: "item",
                in: {
                  k: "$$item.priority",
                  v: "$$item.count",
                },
              },
            },
          },
        },
      },
    ]);

    res.json({
      success: true,
      data: stats[0] || {
        totalTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
        completionRate: 0,
        statusBreakdown: {},
        priorityBreakdown: {},
      },
    });
  } catch (err) {
    console.error("Get stats error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch statistics" });
  }
});

// DELETE ADVANCED TASK
router.delete("/:id", auth, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!task) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    console.log("🗑️ Advanced task deleted successfully:", req.params.id);

    res.json({
      success: true,
      message: "Advanced task deleted successfully",
      data: { id: req.params.id },
    });
  } catch (err) {
    console.error("Delete advanced task error:", err);

    if (err.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to delete task",
    });
  }
});

// D:\to-do app\todo-app-backend\routes\advancedTaskRoutes.js
// Thêm endpoint mới cho calendar với recurring support

// GET tasks for calendar với recurring support
router.get("/calendar/recurring", auth, async (req, res) => {
  try {
    const { month, year, startDate, endDate } = req.query;

    let filterStart, filterEnd;

    if (month && year) {
      filterStart = new Date(year, month - 1, 1);
      filterEnd = new Date(year, month, 0, 23, 59, 59);
    } else if (startDate && endDate) {
      filterStart = new Date(startDate);
      filterEnd = new Date(endDate);
    } else {
      // Default: current month
      const now = new Date();
      filterStart = new Date(now.getFullYear(), now.getMonth(), 1);
      filterEnd = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59
      );
    }

    // Lấy tất cả tasks của user
    const allTasks = await Task.find({
      userId: req.user.id,
      $or: [
        // Tasks có dueDate trong khoảng thời gian
        {
          dueDate: {
            $gte: filterStart,
            $lte: filterEnd,
          },
        },
        // Hoặc là recurring tasks có thể tạo instances trong khoảng này
        {
          "recurring.isRecurring": true,
          $or: [
            { startDate: { $lte: filterEnd } },
            { dueDate: { $lte: filterEnd } },
            { createdAt: { $lte: filterEnd } },
          ],
          // Chỉ lấy recurring tasks chưa kết thúc hoặc không có endDate
          $or: [
            { "recurring.endDate": { $gte: filterStart } },
            { "recurring.endDate": null },
            { "recurring.endDate": { $exists: false } },
          ],
        },
      ],
    })
      .populate("projectId", "name color")
      .lean();

    // Xử lý recurring tasks để tạo instances
    const processedTasks = [];

    allTasks.forEach((task) => {
      // Thêm task gốc nếu có dueDate trong khoảng
      if (
        task.dueDate &&
        task.dueDate >= filterStart &&
        task.dueDate <= filterEnd
      ) {
        processedTasks.push({
          ...task,
          isRecurringInstance: false,
          isOriginalTask: true,
        });
      }

      // Xử lý recurring tasks
      if (task.recurring && task.recurring.isRecurring) {
        const instances = getRecurringInstances(task, filterStart, filterEnd);

        instances.forEach((instanceDate) => {
          // Không thêm instance trùng với task gốc đã có
          if (
            task.dueDate &&
            normalizeDate(task.dueDate).getTime() ===
              normalizeDate(instanceDate).getTime()
          ) {
            return;
          }

          processedTasks.push({
            ...task,
            _id: `${task._id}_${instanceDate.toISOString().split("T")[0]}`,
            dueDate: instanceDate,
            isRecurringInstance: true,
            isOriginalTask: false,
            originalTaskId: task._id,
            recurringInstanceDate: instanceDate,
          });
        });
      }
    });

    // Sắp xếp theo dueDate
    processedTasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    res.json({
      success: true,
      data: processedTasks,
      stats: {
        total: processedTasks.length,
        recurring: processedTasks.filter((t) => t.isRecurringInstance).length,
        original: processedTasks.filter((t) => !t.isRecurringInstance).length,
      },
    });
  } catch (err) {
    console.error("Get calendar tasks with recurring error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch calendar tasks",
    });
  }
});

// Helper function để normalize date (bỏ giờ phút giây)
function normalizeDate(date) {
  if (!date) return null;
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Helper function để tính recurring instances
function getRecurringInstances(task, startDate, endDate) {
  const instances = [];

  // Base date để bắt đầu tính recurring
  const baseDate = task.startDate || task.dueDate || task.createdAt;
  if (!baseDate) return instances;

  const start = new Date(baseDate);
  const endRecurring = task.recurring.endDate
    ? new Date(task.recurring.endDate)
    : new Date("2100-01-01"); // Far future if no end date

  let currentDate = new Date(start);

  // Đảm bảo currentDate không trước startDate của recurring
  if (task.startDate && currentDate < new Date(task.startDate)) {
    currentDate = new Date(task.startDate);
  }

  // Tính các instances
  while (currentDate <= endRecurring && currentDate <= endDate) {
    if (currentDate >= startDate && currentDate <= endDate) {
      instances.push(new Date(currentDate));
    }

    // Tính ngày tiếp theo theo pattern
    switch (task.recurring.pattern) {
      case "daily":
        currentDate.setDate(
          currentDate.getDate() + (task.recurring.interval || 1)
        );
        break;
      case "weekly":
        currentDate.setDate(
          currentDate.getDate() + 7 * (task.recurring.interval || 1)
        );
        break;
      case "monthly":
        currentDate.setMonth(
          currentDate.getMonth() + (task.recurring.interval || 1)
        );
        // Xử lý ngày cuối tháng
        const originalDay = start.getDate();
        const lastDayOfMonth = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          0
        ).getDate();
        if (originalDay > lastDayOfMonth) {
          currentDate.setDate(lastDayOfMonth);
        }
        break;
      case "yearly":
        currentDate.setFullYear(
          currentDate.getFullYear() + (task.recurring.interval || 1)
        );
        break;
      default:
        // Default là daily
        currentDate.setDate(
          currentDate.getDate() + (task.recurring.interval || 1)
        );
    }
  }

  return instances;
}

// Thêm endpoint để mark recurring instance as complete
router.patch("/recurring/:id/complete-instance", auth, async (req, res) => {
  try {
    const { instanceDate, completed } = req.body;

    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    if (!task.recurring || !task.recurring.isRecurring) {
      return res.status(400).json({
        success: false,
        message: "Task is not recurring",
      });
    }

    // Tăng completed instances count
    if (completed && instanceDate) {
      task.recurring.completedInstances =
        (task.recurring.completedInstances || 0) + 1;

      // Lưu thông tin instance đã hoàn thành
      if (!task.recurring.completedDates) {
        task.recurring.completedDates = [];
      }
      task.recurring.completedDates.push({
        date: new Date(instanceDate),
        completedAt: new Date(),
      });
    }

    const updatedTask = await task.save();

    res.json({
      success: true,
      data: updatedTask,
      message: "Recurring instance marked as complete",
    });
  } catch (err) {
    console.error("Complete recurring instance error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to complete recurring instance",
    });
  }
});

// Thêm endpoint để skip recurring instance
router.patch("/recurring/:id/skip-instance", auth, async (req, res) => {
  try {
    const { instanceDate, reason } = req.body;

    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    if (!task.recurring || !task.recurring.isRecurring) {
      return res.status(400).json({
        success: false,
        message: "Task is not recurring",
      });
    }

    // Lưu thông tin instance bị skip
    if (!task.recurring.skippedDates) {
      task.recurring.skippedDates = [];
    }

    task.recurring.skippedDates.push({
      date: new Date(instanceDate),
      skippedAt: new Date(),
      reason: reason || "Skipped by user",
    });

    const updatedTask = await task.save();

    res.json({
      success: true,
      data: updatedTask,
      message: "Recurring instance skipped",
    });
  } catch (err) {
    console.error("Skip recurring instance error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to skip recurring instance",
    });
  }
});

module.exports = router;
