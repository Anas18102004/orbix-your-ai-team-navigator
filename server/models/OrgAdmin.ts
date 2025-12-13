import mongoose, { Schema, Document } from 'mongoose';

export interface IOrgAdmin extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId | null; // null if not part of an org yet
  createdAt: Date;
}

const OrgAdminSchema = new Schema<IOrgAdmin>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Index for efficient querying
OrgAdminSchema.index({ userId: 1 });
OrgAdminSchema.index({ organizationId: 1 });
// Allow multiple org admins per org, but one org admin can belong to one org
OrgAdminSchema.index({ userId: 1, organizationId: 1 }, { unique: true });

export const OrgAdmin = mongoose.model<IOrgAdmin>('OrgAdmin', OrgAdminSchema);

