import mongoose, { Schema, Document } from 'mongoose';

export interface IWorkspaceMembership extends Document {
  _id: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: 'omni' | 'crew';
  specialization: 'backend' | 'frontend' | 'qa' | 'devops' | 'pm' | 'design' | null;
  pendingRoleDecision: boolean; // NEW: true if role/specialization needs to be finalized
  selfPreferredSpecialization: 'backend' | 'frontend' | 'qa' | 'devops' | 'pm' | 'design' | null; // Optional: user's self-preference
  joinedAt: Date;
  status: 'active' | 'removed';
  createdAt: Date; // Added by Mongoose timestamps
}

const WorkspaceMembershipSchema = new Schema<IWorkspaceMembership>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['omni', 'crew'], required: true, default: 'crew' },
    specialization: {
      type: String,
      enum: ['backend', 'frontend', 'qa', 'devops', 'pm', 'design', null],
      default: null
    },
    pendingRoleDecision: {
      type: Boolean,
      default: false
    },
    selfPreferredSpecialization: {
      type: String,
      enum: ['backend', 'frontend', 'qa', 'devops', 'pm', 'design', null],
      default: null
    },
    status: { 
      type: String, 
      enum: ['active', 'removed'], 
      default: 'active' 
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Use joinedAt as alias for createdAt
WorkspaceMembershipSchema.virtual('joinedAt').get(function() {
  return this.createdAt;
});

// Compound index to ensure one active membership per user per workspace
WorkspaceMembershipSchema.index({ workspaceId: 1, userId: 1, status: 1 }, { 
  unique: true,
  partialFilterExpression: { status: 'active' }
});

export const WorkspaceMembership = mongoose.model<IWorkspaceMembership>(
  'WorkspaceMembership',
  WorkspaceMembershipSchema
);

