const cron = require("node-cron");
const Task = require("../models/Task");
const Subscription = require("../models/Subscription");
const webpush = require("../webpush");

module.exports = function () {
  console.log("⏳ Cron job started: checking tasks every minute...");

  // Chạy mỗi phút
  cron.schedule("* * * * *", async () => {
    console.log("🔍 Checking overdue tasks...");

    const now = new Date();

    // Tìm task đến hạn nhưng chưa thông báo
    const dueTasks = await Task.find({
      dueDate: { $lte: now },
      completed: false,
      notified: false
    });

    console.log(`📌 Found ${dueTasks.length} due tasks`);

    for (const task of dueTasks) {
      const subs = await Subscription.find({ userId: task.userId });

      if (!subs.length) {
        console.log(`⚠️ No subscriptions for user ${task.userId}`);
        continue;
      }

      const payload = JSON.stringify({
        title: "⏰ Đến hạn công việc!",
        body: `${task.title}`,
        data: { taskId: task._id }
      });

      // Gửi đến tất cả thiết bị của user
      for (const s of subs) {
        try {
          await webpush.sendNotification(s.subscription, payload);
          console.log(`📨 Push sent to user ${task.userId}`);
        } catch (err) {
          console.error("❌ Push error:", err.message);
        }
      }

      // Đánh dấu đã gửi để không gửi lại
      task.notified = true;
      await task.save();
    }
  });
};
