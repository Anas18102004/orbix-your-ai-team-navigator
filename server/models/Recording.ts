import mongoose, { Schema, Document } from 'mongoose';

export interface IRecording extends Document {
  _id: mongoose.Types.ObjectId;
  meetingId: mongoose.Types.ObjectId;
  s3Url: string;
  durationSeconds: number;
  format: string; // 'mp4', 'webm', etc.
  sizeBytes: number;
  createdAt: Date;
  createdByUserId: mongoose.Types.ObjectId;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
}

const RecordingSchema = new Schema<IRecording>(
  {
    meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting', required: true },
    s3Url: { type: String, required: true },
    durationSeconds: { type: Number, required: true },
    format: { type: String, required: true, default: 'mp4' },
    sizeBytes: { type: Number, required: true },
    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
RecordingSchema.index({ meetingId: 1 });
RecordingSchema.index({ createdByUserId: 1 });
RecordingSchema.index({ createdAt: -1 });
RecordingSchema.index({ s3Url: 1 }, { unique: true, sparse: true });

export const Recording = mongoose.model<IRecording>('Recording', RecordingSchema);
