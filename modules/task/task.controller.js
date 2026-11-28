const taskService = require("./task.service");

class TaskController {
  async createTask(req, res, next) {
    try {
      const task = await taskService.createTask(req, res);
      return res.status(201).json(task);
    } catch (error) {
      next(error);
    }
  }

  async getTasks(req, res, next) {
    try {
      const tasks = await taskService.getTasks(req, res);
      return res.json(tasks);
    } catch (error) {
      next(error);
    }
  }

  async getTask(req, res, next) {
    try {
      const task = await taskService.getTask(req, res);
      return res.json(task);
    } catch (error) {
      next(error);
    }
  }

  async markDone(req, res, next) {
    try {
      const task = await taskService.markDone(req, res);
      return res.json(task);
    } catch (error) {
      next(error);
    }
  }

  async approveTask(req, res, next) {
    try {
      const task = await taskService.approveTask(req, res);
      return res.json(task);
    } catch (error) {
      next(error);
    }
  }

  async rejectTask(req, res, next) {
    try {
      const task = await taskService.rejectTask(req, res);
      return res.json(task);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TaskController();