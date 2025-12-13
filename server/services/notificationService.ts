import { Notification } from '../models/Notification';
import mongoose from 'mongoose';

export const createNotification = async (data: {
  userId: string | mongoose.Types.ObjectId;
  workspaceId: string | mongoose.Types.ObjectId;
  type: 'TASK_ASSIGNED' | 'TASK_UPDATED' | 'MESSAGE' | 'MENTION' | 'INVITE';
  entityId?: string | mongoose.Types.ObjectId | null;
  message: string;
}) => {
  const notification = new Notification({
    userId: data.userId,
    workspaceId: data.workspaceId,
    type: data.type,
    entityId: data.entityId || null,
    message: data.message,
    read: false,
  });

  await notification.save();
  return notification;
};

