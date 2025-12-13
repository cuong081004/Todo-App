const express = require("express");
const router = express.Router();
const Project = require("../models/Project");
const Task = require("../models/Task");
const auth = require("../middleware/authMiddleware");

// GET all projects for user with task counts
router.get("/", auth, async (req, res) => {
  try {
    const projects = await Project.find({ userId: req.user.id })
      .sort({ isFavorite: -1, createdAt: -1 });

    // Get task count for each project
    const projectsWithCounts = await Promise.all(
      projects.map(async (project) => {
        const taskCount = await Task.countDocuments({ 
          projectId: project._id,
          userId: req.user.id 
        });
        return { ...project.toObject(), taskCount };
      })
    );

    res.json({ success: true, data: projectsWithCounts });
  } catch (err) {
    console.error("Get projects error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch projects" });
  }
});

// CREATE new project
router.post("/", auth, async (req, res) => {
  try {
    const { name, color, description } = req.body;
    
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Project name is required" });
    }

    const project = new Project({
      name: name.trim(),
      color: color || "#74b9ff",
      description: description?.trim() || "",
      userId: req.user.id
    });

    const savedProject = await project.save();
    res.status(201).json({ success: true, data: savedProject });
  } catch (err) {
    console.error("Create project error:", err);
    res.status(500).json({ success: false, message: "Failed to create project" });
  }
});

// UPDATE project
router.patch("/:id", auth, async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }
    
    res.json({ success: true, data: project });
  } catch (err) {
    console.error("Update project error:", err);
    res.status(500).json({ success: false, message: "Failed to update project" });
  }
});

// DELETE project
router.delete("/:id", auth, async (req, res) => {
  try {
    // Remove project reference from tasks
    await Task.updateMany(
      { projectId: req.params.id, userId: req.user.id },
      { $unset: { projectId: 1 } }
    );
    
    // Delete project
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }
    
    res.json({ success: true, message: "Project deleted successfully" });
  } catch (err) {
    console.error("Delete project error:", err);
    res.status(500).json({ success: false, message: "Failed to delete project" });
  }
});

module.exports = router;