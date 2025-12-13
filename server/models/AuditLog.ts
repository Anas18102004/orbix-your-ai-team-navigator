import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  actorUserId: mongoose.Types.ObjectId;
  actorRole: 'org_admin' | 'omni' | 'crew';
  action: string; // e.g., "invite_created", "role_changed", "workspace_created", "channel_ai_mode_updated", "ai_read_message"
  resourceType: 'workspace' | 'channel' | 'user' | 'invite' | 'message' | 'update' | 'meeting';
  resourceId: mongoose.Types.ObjectId | null;
  detail: Record<string, any>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actorRole: {
      type: String,
      enum: ['org_admin', 'omni', 'crew'],
      required: true,
    },
    action: { type: String, required: true },
    resourceType: {
      type: String,
      enum: ['workspace', 'channel', 'user', 'invite', 'message', 'update', 'meeting'],
      required: true,
    },
    resourceId: { type: Schema.Types.ObjectId, default: null },
    detail: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes for efficient querying
AuditLogSchema.index({ actorUserId: 1, createdAt: -1 });
AuditLogSchema.index({ resourceType: 1, resourceId: 1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 }); // For time-based queries

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
