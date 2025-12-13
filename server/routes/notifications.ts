import express, { Response } from 'express';
import { Notification } from '../models/Notification';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get notifications
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { read, limit = 50 } = req.query;

    let query: any = { userId };

    if (read !== undefined) {
      query.read = read === 'true';
    }

    const notifications = await Notification.find(query)
      .populate('workspaceId', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string));

    res.json({
      notifications: notifications.map((notif) => {
        const workspace = notif.workspaceId as any;
        return {
          _id: notif._id,
          userId: notif.userId,
          workspace: workspace ? {
            _id: workspace._id,
            name: workspace.name,
          } : null,
          type: notif.type,
          entityId: notif.entityId,
          message: notif.message,
          read: notif.read,
          createdAt: notif.createdAt,
        };
      }),
    });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: error.message || 'Failed to get notifications' });
  }
});

// Mark notification as read
router.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const notificationId = req.params.id;

    const notification = await Notification.findOne({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    notification.read = true;
    await notification.save();

    res.json({
      notification: {
        _id: notification._id,
        read: notification.read,
      },
    });
  } catch (error: any) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: error.message || 'Failed to mark notification as read' });
  }
});

export default router;

