import mongoose, { Schema, Document } from 'mongoose';

/**
 * MeetingActionItem Model
 * 
 * Stores action items generated from meetings.
 * Action items exist independently and can optionally link to tasks later.
 * This design supports the PRD requirement for outcome-focused meetings.
 * 
 * AI_HOOK: AI can later populate these via aiMetadata extraction
 */

export interface IMeetingActionItem extends Document {
    _id: mongoose.Types.ObjectId;
    meetingId: mongoose.Types.ObjectId;
    title: string;
    description: string | null;
    assignedTo: mongoose.Types.ObjectId | null;
    dueDate: Date | null;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    linkedTaskId: mongoose.Types.ObjectId | null;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const MeetingActionItemSchema = new Schema<IMeetingActionItem>(
    {
        meetingId: {
            type: Schema.Types.ObjectId,
            ref: 'Meeting',
            required: true,
            index: true
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500
        },
        description: {
            type: String,
            default: null,
            trim: true,
            maxlength: 2000
        },
        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            index: true
        },
        dueDate: {
            type: Date,
            default: null
        },
        status: {
            type: String,
            enum: ['pending', 'in_progress', 'completed', 'cancelled'],
            default: 'pending',
            index: true
        },
        linkedTaskId: {
            type: Schema.Types.ObjectId,
            ref: 'Task',
            default: null
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: true },
    }
);

// Compound indexes for efficient queries
MeetingActionItemSchema.index({ meetingId: 1, status: 1 });
MeetingActionItemSchema.index({ assignedTo: 1, status: 1, dueDate: 1 });
MeetingActionItemSchema.index({ createdAt: -1 });

export const MeetingActionItem = mongoose.model<IMeetingActionItem>(
    'MeetingActionItem',
    MeetingActionItemSchema
);
