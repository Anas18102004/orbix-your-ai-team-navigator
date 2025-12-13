import mongoose, { Schema, Document } from 'mongoose';

export interface IChannel extends Document {
  _id: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  name: string; // e.g., "#general", "backend-squad"
  displayName?: string; // optional friendly name
  slug: string; // normalized string for URLs
  type: 'channel' | 'private_channel';
  memberIds: mongoose.Types.ObjectId[];
  memberCount: number; // cached count
  aiMode: 'active' | 'off';
  createdAt: Date;
  updatedAt: Date;
}

const ChannelSchema = new Schema<IChannel>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    name: { type: String, required: true },
    displayName: { type: String, required: false },
    slug: { type: String, required: true, lowercase: true, trim: true },
    type: { type: String, enum: ['channel', 'private_channel'], required: true, default: 'channel' },
    memberIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    memberCount: { type: Number, default: 0 },
    aiMode: { type: String, enum: ['active', 'off'], required: true, default: 'off' },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

// Auto-generate slug from name if not provided
ChannelSchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  // Update memberCount from memberIds length
  if (this.memberIds) {
    this.memberCount = this.memberIds.length;
  }
  next();
});

// Indexes
ChannelSchema.index({ workspaceId: 1, slug: 1 }, { unique: true });
ChannelSchema.index({ workspaceId: 1, type: 1 });

export const Channel = mongoose.model<IChannel>('Channel', ChannelSchema);

