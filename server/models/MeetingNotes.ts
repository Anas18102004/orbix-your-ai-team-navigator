import mongoose, { Schema, Document } from 'mongoose';

/**
 * MeetingNotes Model
 * 
 * Stores meeting notes with structured sections for documentation.
 * Supports both free-form content and structured sections per PRD.
 * Notes are editable even after meeting completion.
 * 
 * AI_HOOK: AI can later populate sections via meeting transcription analysis
 */

export interface IMeetingNotesSection {
    discussion: string | null;
    decisions: string | null;
    risks: string | null;
    followups: string | null;
}

export interface IMeetingNotes extends Document {
    _id: mongoose.Types.ObjectId;
    meetingId: mongoose.Types.ObjectId;
    content: string;  // Main rich text / markdown content
    sections: IMeetingNotesSection;
    createdBy: mongoose.Types.ObjectId;
    lastEditedBy: mongoose.Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}

const MeetingNotesSectionSchema = new Schema<IMeetingNotesSection>(
    {
        discussion: { type: String, default: null, maxlength: 50000 },
        decisions: { type: String, default: null, maxlength: 10000 },
        risks: { type: String, default: null, maxlength: 10000 },
        followups: { type: String, default: null, maxlength: 10000 },
    },
    { _id: false }
);

const MeetingNotesSchema = new Schema<IMeetingNotes>(
    {
        meetingId: {
            type: Schema.Types.ObjectId,
            ref: 'Meeting',
            required: true,
            index: true,
            unique: true  // One notes document per meeting
        },
        content: {
            type: String,
            default: '',
            maxlength: 100000  // ~100KB text limit
        },
        sections: {
            type: MeetingNotesSectionSchema,
            default: () => ({
                discussion: null,
                decisions: null,
                risks: null,
                followups: null
            })
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        lastEditedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: true },
    }
);

// Index for quick lookup by meeting
MeetingNotesSchema.index({ meetingId: 1 });
MeetingNotesSchema.index({ updatedAt: -1 });

export const MeetingNotes = mongoose.model<IMeetingNotes>(
    'MeetingNotes',
    MeetingNotesSchema
);
