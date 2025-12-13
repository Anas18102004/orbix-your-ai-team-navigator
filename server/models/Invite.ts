import mongoose, { Schema, Document } from 'mongoose';

export interface IInvite extends Document {
  _id: mongoose.Types.ObjectId;
  orgId: mongoose.Types.ObjectId | null; // null if workspace-level invite
  workspaceId: mongoose.Types.ObjectId | null; // null if org-level invite
  email: string;
  invitedRole: 'org_admin' | 'omni' | 'crew';
  invitedSpecialization: 'backend' | 'frontend' | 'qa' | 'devops' | 'pm' | 'design' | null;
  roleDecisionMode: 'fixed' | 'pending'; // NEW: 'fixed' = role/specialization set, 'pending' = decide later
  createdByUserId: mongoose.Types.ObjectId;
  createdByRole: 'org_admin' | 'omni';
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  code: string; // For code-based invites
  createdAt: Date;
  expiresAt: Date | null;
}

const InviteSchema = new Schema<IInvite>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', default: null },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', default: null },
    email: { type: String, required: true },
    invitedRole: { 
      type: String, 
      enum: ['org_admin', 'omni', 'crew'], 
      required: true 
    },
    invitedSpecialization: { 
      type: String, 
      enum: ['backend', 'frontend', 'qa', 'devops', 'pm', 'design', null],
      default: null 
    },
    roleDecisionMode: {
      type: String,
      enum: ['fixed', 'pending'],
      required: true,
      default: 'fixed'
    },
    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByRole: { 
      type: String, 
      enum: ['org_admin', 'omni'], 
      required: true 
    },
    status: { 
      type: String, 
      enum: ['pending', 'accepted', 'revoked', 'expired'], 
      default: 'pending' 
    },
    code: { type: String, required: true, unique: true },
    expiresAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes for efficient querying
InviteSchema.index({ email: 1, status: 1 });
InviteSchema.index({ code: 1 });
InviteSchema.index({ workspaceId: 1, status: 1 });
InviteSchema.index({ orgId: 1, status: 1 });

export const Invite = mongoose.model<IInvite>('Invite', InviteSchema);

