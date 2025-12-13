import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  _id: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done' | 'blocked';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  assigneeId: mongoose.Types.ObjectId | null;
  creatorId: mongoose.Types.ObjectId;
  relatedMessageId: mongoose.Types.ObjectId | null;
  dueDate: Date | null;
  aiNotes: string | null;
  aiAssignmentReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'done', 'blocked'],
      required: true,
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['P0', 'P1', 'P2', 'P3'],
      required: true,
      default: 'P2',
    },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    relatedMessageId: { type: Schema.Types.ObjectId, ref: 'Message', default: null },
    dueDate: { type: Date, default: null },
    aiNotes: { type: String, default: null },
    aiAssignmentReason: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
TaskSchema.index({ workspaceId: 1, status: 1 });
TaskSchema.index({ assigneeId: 1, status: 1 });

export const Task = mongoose.model<ITask>('Task', TaskSchema);

