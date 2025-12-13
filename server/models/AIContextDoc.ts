import mongoose, { Schema, Document } from 'mongoose';

export interface IAIContextDoc extends Document {
  _id: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  type: 'project_profile' | 'update_summary' | 'task_summary' | 'incident_report' | 'chat_summary' | 'meeting_transcript' | 'meeting_summary';
  sourceId: mongoose.Types.ObjectId | null; // Reference to source (task, channel, etc.)
  text: string;
  embedding: number[] | null; // Placeholder until AI computes
  metadata: Record<string, any>;
  createdAt: Date;
}

const AIContextDocSchema = new Schema<IAIContextDoc>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    type: { 
      type: String, 
      enum: ['project_profile', 'update_summary', 'task_summary', 'incident_report', 'chat_summary', 'meeting_transcript', 'meeting_summary'],
      required: true,
    },
    sourceId: { type: Schema.Types.ObjectId, default: null },
    text: { type: String, required: true },
    embedding: { type: [Number], default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes for efficient querying
AIContextDocSchema.index({ workspaceId: 1, type: 1 });
AIContextDocSchema.index({ sourceId: 1 });
AIContextDocSchema.index({ createdAt: -1 });

export const AIContextDoc = mongoose.model<IAIContextDoc>('AIContextDoc', AIContextDocSchema);
