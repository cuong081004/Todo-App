const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const auth = require("../middleware/authMiddleware");

// 🟢 Lấy tất cả task của user đăng nhập
router.get("/", auth, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 🟢 Tạo task mới (có userId)
router.post("/", auth, async (req, res) => {
  console.log("📥 Nhận từ client:", req.body); // 👈 debug
  let { title, dueDate } = req.body;

  // ✅ Chuyển dueDate từ "YYYY-MM-DD" sang Date object (đảm bảo múi giờ VN)
  if (dueDate) {
    const localDate = new Date(dueDate);
    localDate.setHours(localDate.getHours() + 7); // bù múi giờ Việt Nam
    dueDate = localDate;
  }

  const task = new Task({
    title,
    dueDate,
    userId: req.user.id,
  });

  try {
    const newTask = await task.save();
    console.log("✅ Task đã lưu:", newTask); // 👈 debug
    res.status(201).json(newTask);
  } catch (err) {
    console.error("❌ Lỗi tạo task:", err);
    res.status(400).json({ message: err.message });
  }
});

// 🟢 Cập nhật task (title hoặc completed)
router.patch("/:id", auth, async (req, res) => {
  try {
    // tìm task thuộc về user hiện tại
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (req.body.title != null) task.title = req.body.title;
    if (req.body.completed != null) task.completed = req.body.completed;

    const updatedTask = await task.save();
    res.json(updatedTask);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 🟢 Xóa task
router.delete("/:id", auth, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json({ message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
