const express = require("express");
const router = express.Router();
const Goal = require("../models/Goal");
const auth = require("../middleware/authMiddleware");

// GET all goals for user
router.get("/", auth, async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: goals,
      count: goals.length,
    });
  } catch (err) {
    console.error("Get goals error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch goals",
    });
  }
});

// CREATE new goal
router.post("/", auth, async (req, res) => {
  try {
    const { title, target, current, type, period } = req.body;

    // Validation
    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Goal title is required",
      });
    }

    if (!target || target < 1) {
      return res.status(400).json({
        success: false,
        message: "Target must be at least 1",
      });
    }

    const goal = new Goal({
      title: title.trim(),
      target: Number(target),
      current: Number(current) || 0,
      type: type || "custom",
      period: period || "monthly",
      userId: req.user.id,
    });

    const savedGoal = await goal.save();

    res.status(201).json({
      success: true,
      data: savedGoal,
      message: "Goal created successfully",
    });
  } catch (err) {
    console.error("Create goal error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create goal",
    });
  }
});

// UPDATE goal
router.patch("/:id", auth, async (req, res) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: "Goal not found",
      });
    }

    // Update fields
    const updateFields = ["title", "target", "current", "type", "period"];
    updateFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === "title") {
          goal.title = String(req.body[field]).trim();
        } else if (field === "target" || field === "current") {
          goal[field] = Number(req.body[field]) || 0;
        } else {
          goal[field] = req.body[field];
        }
      }
    });

    // Update completion status
    if (goal.current >= goal.target && !goal.completed) {
      goal.completed = true;
      goal.completedAt = new Date();
    } else if (goal.current < goal.target && goal.completed) {
      goal.completed = false;
      goal.completedAt = null;
    }

    const updatedGoal = await goal.save();

    res.json({
      success: true,
      data: updatedGoal,
      message: "Goal updated successfully",
    });
  } catch (err) {
    console.error("Update goal error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update goal",
    });
  }
});

// DELETE goal
router.delete("/:id", auth, async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: "Goal not found",
      });
    }

    res.json({
      success: true,
      message: "Goal deleted successfully",
    });
  } catch (err) {
    console.error("Delete goal error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete goal",
    });
  }
});

// UPDATE goal progress
router.patch("/:id/progress", auth, async (req, res) => {
  try {
    const { current } = req.body;

    const goal = await Goal.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: "Goal not found",
      });
    }

    goal.current = Number(current) || 0;

    // Update completion status
    if (goal.current >= goal.target && !goal.completed) {
      goal.completed = true;
      goal.completedAt = new Date();
    } else if (goal.current < goal.target && goal.completed) {
      goal.completed = false;
      goal.completedAt = null;
    }

    const updatedGoal = await goal.save();

    res.json({
      success: true,
      data: updatedGoal,
      message: "Goal progress updated",
    });
  } catch (err) {
    console.error("Update progress error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update progress",
    });
  }
});

// GET goal statistics
router.get("/stats", auth, async (req, res) => {
  try {
    const stats = await Goal.aggregate([
      { $match: { userId: req.user.id } },
      {
        $group: {
          _id: null,
          totalGoals: { $sum: 1 },
          completedGoals: { $sum: { $cond: ["$completed", 1, 0] } },
          averageProgress: { $avg: "$progress" },
          byType: {
            $push: {
              type: "$type",
              count: 1,
              completed: { $cond: ["$completed", 1, 0] },
            },
          },
          byPeriod: {
            $push: {
              period: "$period",
              count: 1,
            },
          },
        },
      },
      {
        $project: {
          totalGoals: 1,
          completedGoals: 1,
          completionRate: {
            $multiply: [{ $divide: ["$completedGoals", "$totalGoals"] }, 100],
          },
          averageProgress: 1,
          typeBreakdown: {
            $arrayToObject: {
              $map: {
                input: "$byType",
                as: "item",
                in: {
                  k: "$$item.type",
                  v: {
                    total: "$$item.count",
                    completed: "$$item.completed",
                  },
                },
              },
            },
          },
          periodBreakdown: {
            $arrayToObject: {
              $map: {
                input: "$byPeriod",
                as: "item",
                in: {
                  k: "$$item.period",
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
        totalGoals: 0,
        completedGoals: 0,
        completionRate: 0,
        averageProgress: 0,
        typeBreakdown: {},
        periodBreakdown: {},
      },
    });
  } catch (err) {
    console.error("Get goal stats error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch goal statistics",
    });
  }
});

module.exports = router;