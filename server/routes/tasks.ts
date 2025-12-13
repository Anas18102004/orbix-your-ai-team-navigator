import express, { Response } from 'express';
import { Task } from '../models/Task';
import { WorkspaceMembership } from '../models/WorkspaceMembership';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireWorkspaceMember } from '../middleware/workspaceAuth';
import { createNotification } from '../services/notificationService';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get tasks for workspace
router.get('/:workspaceId/tasks', requireWorkspaceMember, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const userId = req.userId!;
    const membership = (req as any).membership;

    let query: any = { workspaceId };

    // If not omni, filter to tasks assigned to user or created by user
    if (membership.role !== 'omni') {
      query.$or = [
        { assigneeId: userId },
        { creatorId: userId },
      ];
    }

    const tasks = await Task.find(query)
      .populate('assigneeId', 'name email')
      .populate('creatorId', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      tasks: tasks.map((task) => {
        const assignee = task.assigneeId as any;
        const creator = task.creatorId as any;
        return {
          _id: task._id,
          workspaceId: task.workspaceId,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          assignee: assignee ? {
            _id: assignee._id,
            name: assignee.name,
            email: assignee.email,
          } : null,
          creator: {
            _id: creator._id,
            name: creator.name,
            email: creator.email,
          },
          relatedMessageId: task.relatedMessageId,
          dueDate: task.dueDate,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        };
      }),
    });
  } catch (error: any) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: error.message || 'Failed to get tasks' });
  }
});

// Get my tasks
router.get('/:workspaceId/tasks/my', requireWorkspaceMember, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const userId = req.userId!;

    const tasks = await Task.find({
      workspaceId,
      assigneeId: userId,
    })
      .populate('assigneeId', 'name email')
      .populate('creatorId', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      tasks: tasks.map((task) => {
        const assignee = task.assigneeId as any;
        const creator = task.creatorId as any;
        return {
          _id: task._id,
          workspaceId: task.workspaceId,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          assignee: assignee ? {
            _id: assignee._id,
            name: assignee.name,
            email: assignee.email,
          } : null,
          creator: {
            _id: creator._id,
            name: creator.name,
            email: creator.email,
          },
          relatedMessageId: task.relatedMessageId,
          dueDate: task.dueDate,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        };
      }),
    });
  } catch (error: any) {
    console.error('Get my tasks error:', error);
    res.status(500).json({ error: error.message || 'Failed to get tasks' });
  }
});

// Create task
router.post('/:workspaceId/tasks', requireWorkspaceMember, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const userId = req.userId!;
    const {
      title,
      description,
      priority = 'P2',
      assigneeId,
      relatedMessageId,
      dueDate,
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const task = new Task({
      workspaceId,
      title,
      description,
      priority,
      assigneeId: assigneeId || null,
      creatorId: userId,
      relatedMessageId: relatedMessageId || null,
      dueDate: dueDate ? new Date(dueDate) : null,
    });

    await task.save();

    // Create notification if assigned
    if (assigneeId && assigneeId !== userId) {
      await createNotification({
        userId: assigneeId,
        workspaceId,
        type: 'TASK_ASSIGNED',
        entityId: task._id,
        message: `You have been assigned a new task: ${title}`,
      });
    }

    const populatedTask = await Task.findById(task._id)
      .populate('assigneeId', 'name email')
      .populate('creatorId', 'name email');

    const assignee = populatedTask!.assigneeId as any;
    const creator = populatedTask!.creatorId as any;

    res.status(201).json({
      task: {
        _id: populatedTask!._id,
        workspaceId: populatedTask!.workspaceId,
        title: populatedTask!.title,
        description: populatedTask!.description,
        status: populatedTask!.status,
        priority: populatedTask!.priority,
        assignee: assignee ? {
          _id: assignee._id,
          name: assignee.name,
          email: assignee.email,
        } : null,
        creator: {
          _id: creator._id,
          name: creator.name,
          email: creator.email,
        },
        relatedMessageId: populatedTask!.relatedMessageId,
        dueDate: populatedTask!.dueDate,
        createdAt: populatedTask!.createdAt,
        updatedAt: populatedTask!.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Create task error:', error);
    res.status(500).json({ error: error.message || 'Failed to create task' });
  }
});

// Update task
router.patch('/:workspaceId/tasks/:taskId', requireWorkspaceMember, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, taskId } = req.params;
    const userId = req.userId!;
    const membership = (req as any).membership;

    const task = await Task.findOne({ _id: taskId, workspaceId });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check permissions: omni can update any task, others can only update their own
    if (membership.role !== 'omni' && task.creatorId.toString() !== userId && task.assigneeId?.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this task' });
    }

    const {
      title,
      description,
      status,
      priority,
      assigneeId,
      dueDate,
    } = req.body;

    const previousAssigneeId = task.assigneeId?.toString();

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (assigneeId !== undefined) task.assigneeId = assigneeId || null;
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;

    await task.save();

    // Create notifications for status/assignee changes
    if (assigneeId && assigneeId !== previousAssigneeId && assigneeId !== userId) {
      await createNotification({
        userId: assigneeId,
        workspaceId,
        type: 'TASK_ASSIGNED',
        entityId: task._id,
        message: `You have been assigned a new task: ${task.title}`,
      });
    }

    if (status && task.assigneeId && task.assigneeId.toString() !== userId) {
      await createNotification({
        userId: task.assigneeId.toString(),
        workspaceId,
        type: 'TASK_UPDATED',
        entityId: task._id,
        message: `Task "${task.title}" has been updated`,
      });
    }

    const populatedTask = await Task.findById(task._id)
      .populate('assigneeId', 'name email')
      .populate('creatorId', 'name email');

    const assignee = populatedTask!.assigneeId as any;
    const creator = populatedTask!.creatorId as any;

    res.json({
      task: {
        _id: populatedTask!._id,
        workspaceId: populatedTask!.workspaceId,
        title: populatedTask!.title,
        description: populatedTask!.description,
        status: populatedTask!.status,
        priority: populatedTask!.priority,
        assignee: assignee ? {
          _id: assignee._id,
          name: assignee.name,
          email: assignee.email,
        } : null,
        creator: {
          _id: creator._id,
          name: creator.name,
          email: creator.email,
        },
        relatedMessageId: populatedTask!.relatedMessageId,
        dueDate: populatedTask!.dueDate,
        createdAt: populatedTask!.createdAt,
        updatedAt: populatedTask!.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Update task error:', error);
    res.status(500).json({ error: error.message || 'Failed to update task' });
  }
});

export default router;

