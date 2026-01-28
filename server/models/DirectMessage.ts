import mongoose, { Schema, Document } from 'mongoose';

export interface IDirectMessage extends Document {
  _id: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[]; // Array of user IDs
  isWorkspaceScoped: boolean; // false if global group DM
  workspaceId: mongoose.Types.ObjectId | null; // optional if workspace-scoped
  signature: string; // Unique identifier: sorted-participant-ids-joined
  createdAt: Date;
  updatedAt: Date;
}

const DirectMessageSchema = new Schema<IDirectMessage>(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    isWorkspaceScoped: { type: Boolean, default: false },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', default: null },
    signature: { type: String, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

// Ensure participants array is sorted and signature is generated
DirectMessageSchema.pre('validate', function (next) {
  if (this.participants && this.participants.length > 0) {
    this.participants.sort();

    // Generate signature
    const participantsStr = this.participants.map(p => p.toString()).join('_');
    const scopeStr = this.isWorkspaceScoped && this.workspaceId ? `_${this.workspaceId.toString()}` : '';
    this.signature = participantsStr + scopeStr;
  }
  next();
});

// Indexes
DirectMessageSchema.index({ participants: 1 }); // NOT unique (multikey issue)
DirectMessageSchema.index({ signature: 1 }, { unique: true }); // The real unique constraint
DirectMessageSchema.index({ workspaceId: 1 });
DirectMessageSchema.index({ isWorkspaceScoped: 1 });

export const DirectMessage = mongoose.model<IDirectMessage>('DirectMessage', DirectMessageSchema);
