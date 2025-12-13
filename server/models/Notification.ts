import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  type: 'TASK_ASSIGNED' | 'TASK_UPDATED' | 'MESSAGE' | 'MENTION' | 'INVITE';
  entityId: mongoose.Types.ObjectId | null;
  message: string;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    type: {
      type: String,
      enum: ['TASK_ASSIGNED', 'TASK_UPDATED', 'MESSAGE', 'MENTION', 'INVITE'],
      required: true,
    },
    entityId: { type: Schema.Types.ObjectId, default: null },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Index for efficient querying
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);

