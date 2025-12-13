import mongoose, { Schema, Document } from 'mongoose';

export interface IParticipant {
  userId: mongoose.Types.ObjectId;
  joinedAt: Date | null;
  leftAt: Date | null;
  consent: {
    recording: boolean;
    transcription: boolean;
  };
}

export interface IMeeting extends Document {
  _id: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  channelId: mongoose.Types.ObjectId | null;
  title: string;
  agenda: string | null;
  organizerId: mongoose.Types.ObjectId;
  status: 'scheduled' | 'in_progress' | 'ended' | 'cancelled';
  startTime: Date | null;
  endTime: Date | null;
  participants: IParticipant[];
  recordingIds: mongoose.Types.ObjectId[];
  transcriptId: mongoose.Types.ObjectId | null;
  aiSummaryId: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const ParticipantSchema = new Schema<IParticipant>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    joinedAt: { type: Date, default: null },
    leftAt: { type: Date, default: null },
    consent: {
      recording: { type: Boolean, default: false },
      transcription: { type: Boolean, default: false },
    },
  },
  { _id: false }
);

const MeetingSchema = new Schema<IMeeting>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    channelId: { type: Schema.Types.ObjectId, ref: 'Channel', default: null },
    title: { type: String, required: true },
    agenda: { type: String, default: null },
    organizerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'ended', 'cancelled'],
      default: 'scheduled',
    },
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
    participants: [ParticipantSchema],
    recordingIds: [{ type: Schema.Types.ObjectId, ref: 'Recording' }],
    transcriptId: { type: Schema.Types.ObjectId, ref: 'AIContextDoc', default: null },
    aiSummaryId: { type: Schema.Types.ObjectId, ref: 'AIContextDoc', default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

// Indexes
MeetingSchema.index({ workspaceId: 1, status: 1 });
MeetingSchema.index({ organizerId: 1, status: 1 });
MeetingSchema.index({ startTime: 1 });
MeetingSchema.index({ 'participants.userId': 1 });
MeetingSchema.index({ createdAt: -1 });

export const Meeting = mongoose.model<IMeeting>('Meeting', MeetingSchema);
