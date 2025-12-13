import mongoose, { Schema, Document } from 'mongoose';
import { IProjectProfile } from './Workspace';

// Separate collection for AI indexing
export interface IProjectProfileDoc extends Document {
  _id: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  projectProfile: IProjectProfile;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectProfileDocSchema = new Schema<IProjectProfileDoc>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, unique: true },
    projectProfile: {
      projectName: { type: String, required: true },
      projectType: { type: String, enum: ['Greenfield', 'Maintenance', 'Migration', 'Ops'], required: true },
      domainTags: [{ type: String }],
      primaryGoal: { type: String, required: true },
      topOutcomes: [{ type: String }],
      outOfScope: [{ type: String }],
      targetEndDate: { type: Date },
      duration: { type: String },
      milestones: [{
        name: { type: String, required: true },
        date: { type: Date, required: true }
      }],
      frontendTech: [{ type: String }],
      backendTech: [{ type: String }],
      infraPlatforms: [{ type: String }],
      speedStabilityCost: { type: Number, min: 0, max: 100, default: 50 },
      deadlineFlexibility: { type: String, enum: ['Flexible', 'Somewhat Flexible', 'Fixed'], required: true },
      criticalModules: [{ type: String }],
      workflow: { type: String, enum: ['Agile', 'Kanban', 'Ad-hoc'], required: true },
      collaborationStyle: { type: String, enum: ['Mostly async', 'Daily standups', 'Weekly syncs'], required: true },
      aiAutomationMode: { type: String, enum: ['assist', 'semi_auto', 'full_auto'], required: true, default: 'assist' },
    },
  },
  {
    timestamps: true,
  }
);

// Index for AI service queries
ProjectProfileDocSchema.index({ workspaceId: 1 });

export const ProjectProfileDoc = mongoose.model<IProjectProfileDoc>('ProjectProfile', ProjectProfileDocSchema);

