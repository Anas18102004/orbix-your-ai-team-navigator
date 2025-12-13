import mongoose, { Schema, Document } from 'mongoose';

export interface IProjectProfile {
  projectType: 'Greenfield' | 'Maintenance' | 'Migration' | 'Ops';
  domainTags: string[];
  goalOneLine: string; // Renamed from primaryGoal
  topOutcomes: string[]; // Array of 3 items
  inScope?: string[]; // New field
  outOfScope?: string[];
  targetEndDate?: Date;
  milestones?: Array<{ name: string; targetDate: Date }>; // Renamed date to targetDate
  frontendStack: string[]; // Renamed from frontendTech
  backendStack: string[]; // Renamed from backendTech
  infraStack: string[]; // Renamed from infraPlatforms
  speedStabilityCostBias: { speed: number; stability: number; cost: number }; // Changed structure
  deadlineFlexibility: 'Flexible' | 'Somewhat Flexible' | 'Fixed';
  criticalModules: string[];
  workflow: 'Agile' | 'Kanban' | 'Ad-hoc';
}

export interface IAISettings {
  automationMode: 'assist' | 'semi_auto' | 'full_auto';
  cultureMode: 'open' | 'semi_private' | 'privacy_first';
}

export interface IWorkspacePolicy {
  recordingRequiresAll: boolean; // All participants must consent before recording
  recordingDownloadAllowed: boolean; // Crew can download recordings
  retentionDays?: number; // Workspace-specific retention (overrides default)
}

export interface ITeamConfig {
  acceptedCrewPlan: Array<{ specialization: string; desiredCount: number }>;
}

export interface IWorkspace extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string; // Renamed from purpose
  orgId: mongoose.Types.ObjectId | null;
  createdBy: mongoose.Types.ObjectId;
  omniIds: mongoose.Types.ObjectId[]; // Array of Omni user IDs
  projectProfile?: IProjectProfile;
  aiSettings?: IAISettings;
  teamConfig?: ITeamConfig;
  policy?: IWorkspacePolicy;
  retentionDays?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectProfileSchema = new Schema<IProjectProfile>(
  {
    projectType: { type: String, enum: ['Greenfield', 'Maintenance', 'Migration', 'Ops'], required: true },
    domainTags: [{ type: String }],
    goalOneLine: { type: String, required: true },
    topOutcomes: [{ type: String }], // Should have exactly 3
    inScope: [{ type: String }],
    outOfScope: [{ type: String }],
    targetEndDate: { type: Date },
    milestones: [{
      name: { type: String, required: true },
      targetDate: { type: Date, required: true }
    }],
    frontendStack: [{ type: String }],
    backendStack: [{ type: String }],
    infraStack: [{ type: String }],
    speedStabilityCostBias: {
      speed: { type: Number, min: 0, max: 100, default: 33 },
      stability: { type: Number, min: 0, max: 100, default: 33 },
      cost: { type: Number, min: 0, max: 100, default: 34 }
    },
    deadlineFlexibility: { type: String, enum: ['Flexible', 'Somewhat Flexible', 'Fixed'], required: true },
    criticalModules: [{ type: String }],
    workflow: { type: String, enum: ['Agile', 'Kanban', 'Ad-hoc'], required: true },
  },
  { _id: false }
);

const AISettingsSchema = new Schema<IAISettings>(
  {
    automationMode: { type: String, enum: ['assist', 'semi_auto', 'full_auto'], required: true, default: 'assist' },
    cultureMode: { type: String, enum: ['open', 'semi_private', 'privacy_first'], required: true, default: 'open' },
  },
  { _id: false }
);

const TeamConfigSchema = new Schema<ITeamConfig>(
  {
    acceptedCrewPlan: [{
      specialization: { type: String, required: true },
      desiredCount: { type: Number, required: true, min: 0 }
    }]
  },
  { _id: false }
);

const WorkspacePolicySchema = new Schema<IWorkspacePolicy>(
  {
    recordingRequiresAll: { type: Boolean, default: false },
    recordingDownloadAllowed: { type: Boolean, default: false },
  },
  { _id: false }
);

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    omniIds: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Array of Omni user IDs
    projectProfile: { type: ProjectProfileSchema, default: null },
    aiSettings: { type: AISettingsSchema, default: null },
    teamConfig: { type: TeamConfigSchema, default: null },
    policy: { type: WorkspacePolicySchema, default: null },
    retentionDays: { type: Number, default: null },
  },
  {
    timestamps: true,
  }
);

export const Workspace = mongoose.model<IWorkspace>('Workspace', WorkspaceSchema);

