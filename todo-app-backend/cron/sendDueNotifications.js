const cron = require("node-cron");
const Task = require("../models/Task");
const Subscription = require("../models/Subscription");
const webpush = require("../webpush");

/**
 * Cron job runs every minute.
 * It finds tasks:
 *   - dueDate <= now
 *   - completed: false
 *   - notified: false
 * Sends Web Push to all subscriptions for task.userId,
 * then marks task.notified = true to avoid duplicate sends.
 */
module.exports = function () {
  console.log("⏳ Cron job started: checking tasks every minute...");

  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      // Find tasks already due (or due at this minute) and not notified yet
      const dueTasks = await Task.find({
        dueDate: { $lte: now },
        completed: false,
        notified: false,
      });

      if (!dueTasks.length) {
        // nothing to do
        return;
      }

      console.log(`📌 Found ${dueTasks.length} due tasks at ${now.toISOString()}`);

      for (const task of dueTasks) {
        try {
          const subs = await Subscription.find({ userId: task.userId });
          if (!subs || subs.length === 0) {
            console.log(`⚠️ No subscriptions for user ${task.userId}`);
            // still mark notified to avoid repeated checks? we will mark only if sent.
            continue;
          }

          const payload = JSON.stringify({
            title: "⏰ Đến hạn công việc!",
            body: `${task.title}`,
            data: { taskId: task._id },
          });

          // send to each subscription
          const sendResults = await Promise.all(
            subs.map(async (s) => {
              try {
                await webpush.sendNotification(s.subscription, payload);
                return { ok: true };
              } catch (err) {
                return { ok: false, error: err?.message || err };
              }
            })
          );

          const successCount = sendResults.filter(r => r.ok).length;
          console.log(`📨 Push sent to user ${task.userId} (${successCount}/${sendResults.length})`);

          // Mark task as notified so we don't re-send
          task.notified = true;
          await task.save();
        } catch (innerErr) {
          console.error("Error processing task push:", innerErr);
        }
      }
    } catch (err) {
      console.error("Cron job error:", err);
    }
  });
};
