import mongoose, { Schema, Document } from 'mongoose';

/**
 * Meeting Model - Extended for Production-Grade, AI-Ready Meetings
 * 
 * Core design principle: A meeting is not a calendar event — it is an execution trigger.
 * Everything leads to: clarity, decisions, action items, accountability.
 * 
 * AI_HOOK: aiAgenda, aiSummary, aiDecisions, aiRisks, aiMetadata fields are AI-ready
 * but the system works perfectly WITHOUT AI. AI can populate these later.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type MeetingType = 'standup' | 'planning' | 'review' | 'retrospective' | '1:1' | 'custom';
export type MeetingStatus = 'scheduled' | 'in_progress' | 'ended' | 'cancelled' | 'rescheduled';
export type ParticipantRole = 'organizer' | 'host' | 'participant' | 'observer';  // 'host' kept for backward compatibility
export type AttendanceStatus = 'invited' | 'accepted' | 'declined' | 'attended' | 'absent';

// VIDEO_PROVIDER_HOOK: Supported external video providers
// New providers can be added here without refactoring
export type MeetingProvider = 'zoom' | 'google_meet' | 'internal' | null;

// ============================================================================
// PARTICIPANT INTERFACE
// ============================================================================

export interface IParticipant {
  userId: mongoose.Types.ObjectId;
  role: ParticipantRole;
  attendanceStatus: AttendanceStatus;
  joinedAt: Date | null;
  leftAt: Date | null;
  consent: {
    recording: boolean;
    transcription: boolean;
  };
}

// ============================================================================
// MEETING INTERFACE
// ============================================================================

export interface IMeeting extends Document {
  _id: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  channelId: mongoose.Types.ObjectId | null;

  // Core meeting info
  title: string;
  description: string | null;  // NEW: Separate from agenda
  agenda: string | null;
  meetingType: MeetingType;    // NEW: Type of meeting

  // Scheduling
  status: MeetingStatus;
  startTime: Date | null;
  endTime: Date | null;
  timezone: string;            // NEW: Timezone for the meeting
  recurrenceRule: string | null;  // NEW: iCal RRULE format for recurring meetings

  // People
  organizerId: mongoose.Types.ObjectId;
  participants: IParticipant[];

  // Media & AI (existing)
  recordingIds: mongoose.Types.ObjectId[];
  transcriptId: mongoose.Types.ObjectId | null;
  aiSummaryId: mongoose.Types.ObjectId | null;

  // AI-Ready Fields (NEW) - Store now, populate later
  // AI_HOOK: These fields are designed for AI but the system works without them
  aiAgenda: string | null;
  aiSummary: string | null;
  aiDecisions: string[] | null;
  aiRisks: string[] | null;
  aiMetadata: Record<string, unknown> | null;

  // VIDEO_PROVIDER_HOOK: External video meeting provider integration
  // The system works fully without these - they enable Zoom/Google Meet links
  meetingProvider: MeetingProvider;
  meetingJoinUrl: string | null;      // URL for participants to join
  meetingHostUrl: string | null;      // URL for host (may have extra controls)
  meetingExternalId: string | null;   // ID from external provider (Zoom meeting ID, etc.)

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// PARTICIPANT SCHEMA
// ============================================================================

const ParticipantSchema = new Schema<IParticipant>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: ['organizer', 'host', 'participant', 'observer'],  // 'organizer' preferred, 'host' for backward compat
      default: 'participant',
    },
    attendanceStatus: {
      type: String,
      enum: ['invited', 'accepted', 'declined', 'attended', 'absent'],
      default: 'invited',
    },
    joinedAt: { type: Date, default: null },
    leftAt: { type: Date, default: null },
    consent: {
      recording: { type: Boolean, default: false },
      transcription: { type: Boolean, default: false },
    },
  },
  { _id: false }
);

// ============================================================================
// MEETING SCHEMA
// ============================================================================

const MeetingSchema = new Schema<IMeeting>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true
    },
    channelId: {
      type: Schema.Types.ObjectId,
      ref: 'Channel',
      default: null
    },

    // Core meeting info
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    description: {
      type: String,
      default: null,
      trim: true,
      maxlength: 5000
    },
    agenda: {
      type: String,
      default: null,
      maxlength: 10000
    },
    meetingType: {
      type: String,
      enum: ['standup', 'planning', 'review', 'retrospective', '1:1', 'custom'],
      default: 'custom',
    },

    // Scheduling
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'ended', 'cancelled', 'rescheduled'],
      default: 'scheduled',
    },
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
    timezone: {
      type: String,
      default: 'UTC',
      maxlength: 50
    },
    recurrenceRule: {
      type: String,
      default: null,
      maxlength: 500  // iCal RRULE string
    },

    // People
    organizerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    participants: [ParticipantSchema],

    // Media & AI (existing fields preserved)
    recordingIds: [{ type: Schema.Types.ObjectId, ref: 'Recording' }],
    transcriptId: {
      type: Schema.Types.ObjectId,
      ref: 'AIContextDoc',
      default: null
    },
    aiSummaryId: {
      type: Schema.Types.ObjectId,
      ref: 'AIContextDoc',
      default: null
    },

    // AI-Ready Fields (stored directly for flexibility)
    // AI_HOOK: These can be populated by AI services later
    aiAgenda: { type: String, default: null, maxlength: 10000 },
    aiSummary: { type: String, default: null, maxlength: 50000 },
    aiDecisions: { type: [String], default: null },
    aiRisks: { type: [String], default: null },
    aiMetadata: { type: Schema.Types.Mixed, default: null },

    // VIDEO_PROVIDER_HOOK: External video meeting integration
    // System works fully without these - they enable Zoom/Google Meet
    meetingProvider: {
      type: String,
      enum: ['zoom', 'google_meet', 'internal', null],
      default: null,
    },
    meetingJoinUrl: { type: String, default: null, maxlength: 2000 },
    meetingHostUrl: { type: String, default: null, maxlength: 2000 },
    meetingExternalId: { type: String, default: null, maxlength: 200 },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

// ============================================================================
// INDEXES
// ============================================================================

// Primary lookups
MeetingSchema.index({ workspaceId: 1, status: 1 });
MeetingSchema.index({ workspaceId: 1, meetingType: 1 });
MeetingSchema.index({ organizerId: 1, status: 1 });

// Time-based queries
MeetingSchema.index({ startTime: 1 });
MeetingSchema.index({ workspaceId: 1, startTime: -1 });

// Participant lookups
MeetingSchema.index({ 'participants.userId': 1 });
MeetingSchema.index({ 'participants.userId': 1, status: 1 });

// General
MeetingSchema.index({ createdAt: -1 });

// Recurring meeting queries
MeetingSchema.index({ workspaceId: 1, recurrenceRule: 1 });

// ============================================================================
// EXPORT
// ============================================================================

export const Meeting = mongoose.model<IMeeting>('Meeting', MeetingSchema);
