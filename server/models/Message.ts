import mongoose, { Schema, Document } from 'mongoose';

export interface IAttachment {
  url: string;
  type: 'image' | 'file' | 'other';
}

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId | null; // null for global DMs
  channelId: mongoose.Types.ObjectId; // Can reference Channel or DirectMessage
  senderId: mongoose.Types.ObjectId;
  content: string;
  attachments: IAttachment[];
  allowAi: boolean; // true if user explicitly allowed AI to read this message
  createdAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ['image', 'file', 'other'], required: true },
  },
  { _id: false }
);

const MessageSchema = new Schema<IMessage>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', default: null },
    channelId: { type: Schema.Types.ObjectId, required: true }, // Can reference Channel or DirectMessage
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    attachments: [AttachmentSchema],
    allowAi: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Index for efficient querying
MessageSchema.index({ channelId: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);

