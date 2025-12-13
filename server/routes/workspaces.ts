import express, { Response } from 'express';
import { Workspace } from '../models/Workspace';
import { WorkspaceMembership } from '../models/WorkspaceMembership';
import { Invite } from '../models/Invite';
import { Channel } from '../models/Channel';
import { User } from '../models/User';
import { OrgAdmin } from '../models/OrgAdmin';
import { ProjectProfileDoc } from '../models/ProjectProfile';
import { Task } from '../models/Task';
import { Notification } from '../models/Notification';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireWorkspaceMember, requireOmni, requireOmniOrOrgAdmin, requireOrgAdmin } from '../middleware/workspaceAuth';
import { createNotification } from '../services/notificationService';
import { sendWorkspaceInvite } from '../services/emailService';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create workspace
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, orgId } = req.body;
    const userId = req.userId!;

    if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required' });
    }

    // Create workspace
    const workspace = new Workspace({
      name,
      description,
      orgId: orgId || null,
      createdBy: userId,
      omniIds: [userId], // Creator is automatically an Omni
    });

    await workspace.save();

    // Create membership with omni role
    const membership = new WorkspaceMembership({
      workspaceId: workspace._id,
      userId,
      role: 'omni',
      status: 'active',
    });

    await membership.save();

    // Get all workspace members (initially just the creator)
    const allMemberships = await WorkspaceMembership.find({ workspaceId: workspace._id, status: 'active' });
    const allMemberIds = allMemberships.map(m => m.userId);

    // Create default channel named after workspace with all members
    const workspaceChannel = new Channel({
      workspaceId: workspace._id,
      name: `#${workspace.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      displayName: workspace.name,
      slug: workspace.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      type: 'channel',
      memberIds: allMemberIds,
      memberCount: allMemberIds.length,
      aiMode: 'off',
    });

    await workspaceChannel.save();

    res.status(201).json({
      workspace: {
        _id: workspace._id,
        name: workspace.name,
        description: workspace.description,
        createdBy: workspace.createdBy,
        createdAt: workspace.createdAt,
        role: 'omni',
        hasProjectProfile: false, // Indicate project wizard needs to be completed
      },
    });
  } catch (error: any) {
    console.error('Create workspace error:', error);
    res.status(500).json({ error: error.message || 'Failed to create workspace' });
  }
});

// Get all workspaces for current user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const memberships = await WorkspaceMembership.find({ userId, status: 'active' }).populate('workspaceId');

    const workspaces = memberships
      .filter(m => m.status === 'active')
      .map((membership) => {
        const workspace = membership.workspaceId as any;
        return {
          _id: workspace._id,
          name: workspace.name,
          description: workspace.description || workspace.purpose, // Support both for backward compatibility
          createdBy: workspace.createdBy,
          createdAt: workspace.createdAt,
          role: membership.role,
        };
      });

    res.json({ workspaces });
  } catch (error: any) {
    console.error('Get workspaces error:', error);
    res.status(500).json({ error: error.message || 'Failed to get workspaces' });
  }
});

// Get single workspace
router.get('/:id', requireWorkspaceMember, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.id;
    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const membership = (req as any).membership;

    res.json({
      workspace: {
        _id: workspace._id,
        name: workspace.name,
        description: workspace.description || (workspace as any).purpose || '',
        createdBy: workspace.createdBy,
        createdAt: workspace.createdAt,
        role: membership.role,
      },
    });
  } catch (error: any) {
    console.error('Get workspace error:', error);
    res.status(500).json({ error: error.message || 'Failed to get workspace' });
  }
});

// Create invite (code-based, no email)
router.post('/:workspaceId/invites', requireWorkspaceMember, requireOmni, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const userId = req.userId!;
    const { specialization } = req.body;

    // Validate specialization if provided
    const validSpecializations = ['backend', 'frontend', 'qa', 'devops', 'pm', 'design', null];
    if (specialization !== undefined && specialization !== null && !validSpecializations.includes(specialization)) {
      return res.status(400).json({ error: 'Invalid specialization' });
    }

    // Generate unique code
    const code = Math.random().toString(36).substring(2, 15).toUpperCase();

    const invite = new Invite({
      orgId: null,
      workspaceId,
      email: `code-${code}@invite.local`,
      invitedRole: 'crew',
      invitedSpecialization: specialization || null,
      roleDecisionMode: 'fixed',
      createdByUserId: userId,
      createdByRole: 'omni',
      status: 'pending',
      code,
      expiresAt: null, // No expiration for now
    });

    await invite.save();

    res.status(201).json({
      invite: {
        _id: invite._id,
        code: invite.code,
        workspaceId: invite.workspaceId,
        invitedRole: invite.invitedRole,
        invitedSpecialization: invite.invitedSpecialization,
        roleDecisionMode: invite.roleDecisionMode,
        createdAt: invite.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Create invite error:', error);
    res.status(500).json({ error: error.message || 'Failed to create invite' });
  }
});

// Invite member by email (sends email + creates notification)
router.post('/:workspaceId/invites/email', requireWorkspaceMember, requireOmni, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const userId = req.userId!;
    const { email, specialization } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Get workspace
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Get inviter info
    const inviter = await User.findById(userId);
    if (!inviter) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user already exists and is already a member
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const existingMembership = await WorkspaceMembership.findOne({
        workspaceId,
        userId: existingUser._id,
      });
      if (existingMembership) {
        return res.status(400).json({ error: 'User is already a member of this workspace' });
      }
    }

    // Validate specialization if provided
    const validSpecializations = ['backend', 'frontend', 'qa', 'devops', 'pm', 'design', 'mobile', 'data', 'security', 'other', null];
    if (specialization !== undefined && specialization !== null && !validSpecializations.includes(specialization)) {
      return res.status(400).json({ error: 'Invalid specialization' });
    }

    // Generate unique invite code
    const code = Math.random().toString(36).substring(2, 15).toUpperCase();

    // Create invite (crew, email)
    const invite = new Invite({
      orgId: null,
      workspaceId,
      email,
      invitedRole: 'crew',
      invitedSpecialization: specialization || null,
      roleDecisionMode: 'fixed',
      createdByUserId: userId,
      createdByRole: 'omni',
      status: 'pending',
      code,
      expiresAt: null,
    });

    await invite.save();

    // Send email invite
    const emailResult = await sendWorkspaceInvite({
      to: email,
      workspaceName: workspace.name,
      inviterName: inviter.name,
      inviteCode: code,
    });

    // Create notification if user exists in system
    if (existingUser) {
      await createNotification({
        userId: existingUser._id,
        workspaceId,
        type: 'INVITE',
        entityId: invite._id,
        message: `${inviter.name} invited you to join "${workspace.name}"`,
      });
    }
    // Note: If user doesn't exist yet, they'll receive the email with invite code
    // When they register and use the code, they'll join automatically

    res.status(201).json({
      invite: {
        _id: invite._id,
        code: invite.code,
        workspaceId: invite.workspaceId,
        createdAt: invite.createdAt,
      },
      emailSent: emailResult.success,
      message: emailResult.success
        ? 'Invite sent successfully'
        : emailResult.message || 'Invite created but email could not be sent. Please share the invite code manually.',
      emailError: emailResult.error || null,
      emailErrorCode: emailResult.errorCode || null,
    });
  } catch (error: any) {
    console.error('Invite by email error:', error);
    res.status(500).json({ error: error.message || 'Failed to send invite' });
  }
});

// Accept invite (from notification)
router.post('/invites/:inviteId/accept', async (req: AuthRequest, res: Response) => {
  try {
    const { inviteId } = req.params;
    const userId = req.userId!;

    // Find invite
    const invite = await Invite.findById(inviteId);
    if (!invite) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    // Check if expired
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invite has expired' });
    }

    if (!invite.workspaceId) {
      return res.status(400).json({ error: 'Invalid invite type' });
    }

    // Check if already a member
    const existingMembership = await WorkspaceMembership.findOne({
      workspaceId: invite.workspaceId,
      userId,
    });

    if (existingMembership) {
      return res.status(400).json({ error: 'Already a member of this workspace' });
    }

    // Create membership with specialization from invite (if provided)
    const membership = new WorkspaceMembership({
      workspaceId: invite.workspaceId,
      userId,
      role: 'crew',
      specialization: invite.invitedSpecialization || null, // Use invite's specialization
    });

    await membership.save();

    // Get workspace to use its name for channel and response
    const workspace = await Workspace.findById(invite.workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Ensure workspace-named channel exists
    const workspaceSlug = workspace.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    let workspaceChannel = await Channel.findOne({
      workspaceId: invite.workspaceId,
      slug: workspaceSlug,
    });

    if (!workspaceChannel) {
      // Create channel named after workspace if it doesn't exist
      workspaceChannel = new Channel({
        workspaceId: invite.workspaceId,
        name: `#${workspaceSlug}`,
        displayName: workspace.name,
        slug: workspaceSlug,
        type: 'channel',
        memberIds: [], // Empty means all workspace members
        aiMode: 'off',
      });
      await workspaceChannel.save();
    }

    // Add user to all channels in the workspace
    await Channel.updateMany(
      { workspaceId: invite.workspaceId, type: 'channel' },
      { $addToSet: { memberIds: userId } }
    );

    // Update memberCount for all channels
    const channels = await Channel.find({ workspaceId: invite.workspaceId });
    for (const channel of channels) {
      if (channel.memberIds) {
        channel.memberCount = channel.memberIds.length;
        await channel.save();
      }
    }

    // Mark related notification as read
    await Notification.updateMany(
      { userId, type: 'INVITE', entityId: invite._id },
      { read: true }
    );

    // Notify inviter
    const inviterMembership = await WorkspaceMembership.findOne({
      workspaceId: invite.workspaceId,
      userId: invite.createdByUserId,
    });

    if (inviterMembership) {
      const joinedUser = await User.findById(userId);
      if (joinedUser) {
        await createNotification({
          userId: invite.createdByUserId,
          workspaceId: invite.workspaceId,
          type: 'INVITE',
          entityId: membership._id,
          message: `${joinedUser.name} accepted your invitation to join "${workspace.name}"`,
        });
      }
    }

    res.status(200).json({
      workspace: {
        _id: workspace._id,
        name: workspace.name,
        description: workspace.description || (workspace as any).purpose || '',
        createdBy: workspace.createdBy,
        createdAt: workspace.createdAt,
        role: membership.role,
      },
      message: 'Successfully joined workspace',
    });
  } catch (error: any) {
    console.error('Accept invite error:', error);
    res.status(500).json({ error: error.message || 'Failed to accept invite' });
  }
});

// Reject invite (from notification)
router.post('/invites/:inviteId/reject', async (req: AuthRequest, res: Response) => {
  try {
    const { inviteId } = req.params;
    const userId = req.userId!;

    // Find invite
    const invite = await Invite.findById(inviteId);
    if (!invite) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    // Mark related notification as read
    await Notification.updateMany(
      { userId, type: 'INVITE', entityId: invite._id },
      { read: true }
    );

    // Get workspace and rejecting user info
    const workspace = await Workspace.findById(invite.workspaceId);
    const rejectingUser = await User.findById(userId);

    // Notify inviter (optional - you can remove this if you don't want to notify on rejection)
    if (rejectingUser && workspace && invite.workspaceId) {
      const inviterMembership = await WorkspaceMembership.findOne({
        workspaceId: invite.workspaceId,
        userId: invite.createdByUserId,
      });

      if (inviterMembership) {
        await createNotification({
          userId: invite.createdByUserId,
          workspaceId: invite.workspaceId,
          type: 'INVITE',
          entityId: invite._id,
          message: `${rejectingUser.name} declined your invitation to join "${workspace.name}"`,
        });
      }
    }

    res.status(200).json({
      message: 'Invite rejected',
    });
  } catch (error: any) {
    console.error('Reject invite error:', error);
    res.status(500).json({ error: error.message || 'Failed to reject invite' });
  }
});

// Join workspace (by code)
router.post('/join', async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    const userId = req.userId!;

    if (!code) {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    // Find invite
    const invite = await Invite.findOne({ code });
    if (!invite) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    // Check if expired
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invite code has expired' });
    }

    if (!invite.workspaceId) {
      return res.status(400).json({ error: 'Invalid invite code' });
    }

    // Check if already a member
    const existingMembership = await WorkspaceMembership.findOne({
      workspaceId: invite.workspaceId,
      userId,
    });

    if (existingMembership) {
      return res.status(400).json({ error: 'Already a member of this workspace' });
    }

    // Create membership with specialization from invite (if provided)
    // For generic code joins, specialization will be null (unassigned)
    const membership = new WorkspaceMembership({
      workspaceId: invite.workspaceId,
      userId,
      role: 'crew',
      specialization: invite.invitedSpecialization || null,
    });

    await membership.save();

    // Get workspace to use its name for channel
    const workspaceForChannel = await Workspace.findById(invite.workspaceId);
    if (!workspaceForChannel) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Ensure workspace-named channel exists
    const workspaceSlug = workspaceForChannel.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    let workspaceChannel = await Channel.findOne({
      workspaceId: invite.workspaceId,
      slug: workspaceSlug,
    });

    if (!workspaceChannel) {
      // Create channel named after workspace if it doesn't exist
      workspaceChannel = new Channel({
        workspaceId: invite.workspaceId,
        name: `#${workspaceSlug}`,
        displayName: workspaceForChannel.name,
        slug: workspaceSlug,
        type: 'channel',
        memberIds: [], // Empty means all workspace members
        aiMode: 'off',
      });
      await workspaceChannel.save();
    }

    // Add user to all channels in the workspace
    await Channel.updateMany(
      { workspaceId: invite.workspaceId, type: 'channel' },
      { $addToSet: { memberIds: userId } }
    );

    // Update memberCount for all channels
    const channels = await Channel.find({ workspaceId: invite.workspaceId });
    for (const channel of channels) {
      if (channel.memberIds) {
        channel.memberCount = channel.memberIds.length;
        await channel.save();
      }
    }

    // Get workspace for response
    const workspace = await Workspace.findById(invite.workspaceId);

    res.status(201).json({
      workspace: {
        _id: workspace!._id,
        name: workspace!.name,
        description: workspace!.description || (workspace as any).purpose || '',
        createdBy: workspace!.createdBy,
        createdAt: workspace!.createdAt,
        role: membership.role, // Use the actual membership role
      },
    });
  } catch (error: any) {
    console.error('Join workspace error:', error);
    res.status(500).json({ error: error.message || 'Failed to join workspace' });
  }
});

// Get workspace members (role-based visibility: Crew sees limited, Omni/Org Admin see full)
router.get('/:workspaceId/members', requireWorkspaceMember, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const userId = req.userId!;
    const membership = (req as any).membership;

    // Check if user is org admin
    const { OrgAdmin } = await import('../models/OrgAdmin');
    const orgAdmin = await OrgAdmin.findOne({ userId });
    const isOrgAdmin = !!orgAdmin;

    // Determine viewer role
    const viewerRole = isOrgAdmin ? 'org_admin' : membership.role;
    const canSeeFullInfo = viewerRole === 'omni' || viewerRole === 'org_admin';

    const memberships = await WorkspaceMembership.find({ workspaceId, status: 'active' })
      .populate('userId', 'name email')
      .sort({ createdAt: 1 });

    // Get online status (simplified - in production, use presence service)
    // Get online status (simplified - in production, use presence service)
    const members = memberships
      .filter(mem => mem.userId) // Filter out orphaned memberships
      .map((mem) => {
        const user = mem.userId as any;
        const baseData: any = {
          _id: user._id,
          name: user.name,
          role: mem.role,
          specialization: mem.specialization,
          online: false, // TODO: Integrate with presence service
        };

        // Crew can only see: avatar, name, role, specialization, online status
        // Omni/Org Admin can see: all above + email, joinedAt, status, pendingRoleDecision
        if (canSeeFullInfo) {
          baseData.email = user.email;
          baseData.joinedAt = (mem as any).createdAt || (mem as any).joinedAt || null;
          baseData.status = mem.status;
          baseData.pendingRoleDecision = mem.pendingRoleDecision;
          baseData.selfPreferredSpecialization = mem.selfPreferredSpecialization;
        }

        return baseData;
      });

    // Separate into omnis, crew, pendingCrew for easier frontend rendering
    const omnis = members.filter(m => m.role === 'omni');
    const crew = members.filter(m => m.role === 'crew' && !m.pendingRoleDecision);
    const pendingCrew = members.filter(m => m.role === 'crew' && m.pendingRoleDecision);

    // Calculate stats (only for Omni/Org Admin)
    const stats = canSeeFullInfo ? {
      total: members.length,
      omnis: omnis.length,
      crew: crew.length,
      pendingCrew: pendingCrew.length,
    } : null;

    res.json({
      members,
      omnis: canSeeFullInfo ? omnis : [],
      crew,
      pendingCrew: canSeeFullInfo ? pendingCrew : [],
      stats,
      viewerRole,
      canSeeFullInfo,
    });
  } catch (error: any) {
    console.error('Get members error:', error);
    res.status(500).json({ error: error.message || 'Failed to get members' });
  }
});

// Get workspace members for chat search (optimized)
router.get('/:workspaceId/members/chat', requireWorkspaceMember, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const { q } = req.query;

    // Only search if query is provided
    if (!q || typeof q !== 'string') {
      return res.json({ members: [] });
    }

    const searchQuery = new RegExp(q, 'i');

    // Find users directly
    const users = await User.find({
      name: searchQuery
    }).select('name email').limit(10);

    // Verify they are in the workspace
    const userIds = users.map(u => u._id);
    const memberships = await WorkspaceMembership.find({
      workspaceId,
      userId: { $in: userIds },
      status: 'active'
    });

    const validMemberIds = new Set(memberships.map(m => m.userId.toString()));

    const validMembers = users.filter(u => validMemberIds.has(u._id.toString())).map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email
    }));

    res.json({ members: validMembers });

  } catch (error: any) {
    console.error('Chat member search error:', error);
    res.status(500).json({ error: error.message || 'Failed to search members' });
  }
});


// Project Definition Wizard - Save project profile
router.post('/:workspaceId/project-profile', requireWorkspaceMember, requireOmni, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const { projectProfile, aiSettings } = req.body;

    if (!projectProfile) {
      return res.status(400).json({ error: 'Project profile is required' });
    }

    // Validate required fields
    const requiredFields = ['projectType', 'goalOneLine', 'topOutcomes', 'deadlineFlexibility', 'workflow'];
    for (const field of requiredFields) {
      if (!projectProfile[field]) {
        return res.status(400).json({ error: `${field} is required` });
      }
    }

    // Validate topOutcomes has exactly 3 items
    if (!Array.isArray(projectProfile.topOutcomes) || projectProfile.topOutcomes.length !== 3) {
      return res.status(400).json({ error: 'topOutcomes must have exactly 3 items' });
    }

    // Validate aiSettings if provided
    if (aiSettings) {
      if (!aiSettings.automationMode || !aiSettings.cultureMode) {
        return res.status(400).json({ error: 'aiSettings must include automationMode and cultureMode' });
      }
    }

    // Prepare update object
    const updateData: any = { projectProfile };
    if (aiSettings) {
      updateData.aiSettings = aiSettings;
    }

    // Update workspace with project profile and AI settings
    const workspace = await Workspace.findByIdAndUpdate(
      workspaceId,
      updateData,
      { new: true }
    );

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Create natural language summary for AI context
    const naturalLanguageSummary = `
Project: ${workspace.name}
Type: ${projectProfile.projectType}
Goal: ${projectProfile.goalOneLine}
Top Outcomes: ${projectProfile.topOutcomes.join(', ')}
Workflow: ${projectProfile.workflow}
Tech Stack: Frontend: ${projectProfile.frontendStack?.join(', ') || 'Not specified'}, Backend: ${projectProfile.backendStack?.join(', ') || 'Not specified'}, Infrastructure: ${projectProfile.infraStack?.join(', ') || 'Not specified'}
AI Mode: ${aiSettings?.automationMode || 'assist'}, Culture: ${aiSettings?.cultureMode || 'open'}
    `.trim();

    // Save to AI context documents collection
    const { AIContextDoc } = await import('../models/AIContextDoc');
    await AIContextDoc.findOneAndUpdate(
      { workspaceId, type: 'project_profile' },
      {
        workspaceId,
        type: 'project_profile',
        text: naturalLanguageSummary,
        metadata: {
          projectType: projectProfile.projectType,
          workflow: projectProfile.workflow,
          automationMode: aiSettings?.automationMode,
          cultureMode: aiSettings?.cultureMode,
        }
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      workspace: {
        _id: workspace._id,
        name: workspace.name,
        projectProfile: workspace.projectProfile,
        aiSettings: workspace.aiSettings,
      },
    });
  } catch (error: any) {
    console.error('Save project profile error:', error);
    res.status(500).json({ error: error.message || 'Failed to save project profile' });
  }
});

// Get project profile
router.get('/:workspaceId/project-profile', requireWorkspaceMember, requireOmniOrOrgAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const workspace = await Workspace.findById(workspaceId).select('projectProfile');

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    res.json({
      projectProfile: workspace.projectProfile || null,
    });
  } catch (error: any) {
    console.error('Get project profile error:', error);
    res.status(500).json({ error: error.message || 'Failed to get project profile' });
  }
});

// Update team config (AI suggestions acceptance)
router.patch('/:workspaceId/team-config', requireWorkspaceMember, requireOmni, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const { acceptedCrewPlan } = req.body;

    if (!acceptedCrewPlan || !Array.isArray(acceptedCrewPlan)) {
      return res.status(400).json({ error: 'acceptedCrewPlan must be an array' });
    }

    // Validate structure
    for (const plan of acceptedCrewPlan) {
      if (!plan.specialization || typeof plan.desiredCount !== 'number') {
        return res.status(400).json({ error: 'Each plan item must have specialization and desiredCount' });
      }
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Update or create team config
    if (!workspace.teamConfig) {
      workspace.teamConfig = { acceptedCrewPlan: [] };
    }
    workspace.teamConfig.acceptedCrewPlan = acceptedCrewPlan;
    await workspace.save();

    res.json({
      success: true,
      teamConfig: workspace.teamConfig,
    });
  } catch (error: any) {
    console.error('Update team config error:', error);
    res.status(500).json({ error: error.message || 'Failed to update team config' });
  }
});

// Get team config
router.get('/:workspaceId/team-config', requireWorkspaceMember, requireOmniOrOrgAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const workspace = await Workspace.findById(workspaceId).select('teamConfig');

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    res.json({
      teamConfig: workspace.teamConfig || null,
    });
  } catch (error: any) {
    console.error('Get team config error:', error);
    res.status(500).json({ error: error.message || 'Failed to get team config' });
  }
});

// Project Pulse / Stats (Omni and Org Admin only)
router.get('/:workspaceId/pulse', requireWorkspaceMember, requireOmniOrOrgAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;

    // Get all tasks
    const tasks = await Task.find({ workspaceId });

    // Calculate stats
    const totalTasks = tasks.length;
    const byStatus = {
      todo: tasks.filter(t => t.status === 'todo').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      done: tasks.filter(t => t.status === 'done').length,
      blocked: tasks.filter(t => t.status === 'blocked').length,
    };

    const byPriority = {
      P0: tasks.filter(t => t.priority === 'P0').length,
      P1: tasks.filter(t => t.priority === 'P1').length,
      P2: tasks.filter(t => t.priority === 'P2').length,
      P3: tasks.filter(t => t.priority === 'P3').length,
    };

    const openP0P1 = byPriority.P0 + byPriority.P1;
    const completionPercent = totalTasks > 0 ? (byStatus.done / totalTasks) * 100 : 0;

    // Simple status indicator (can be enhanced later)
    let statusIndicator: 'On Track' | 'At Risk' | 'Off Track' = 'On Track';
    if (openP0P1 > totalTasks * 0.3 || byStatus.blocked > totalTasks * 0.2) {
      statusIndicator = 'At Risk';
    }
    if (openP0P1 > totalTasks * 0.5 || byStatus.blocked > totalTasks * 0.3) {
      statusIndicator = 'Off Track';
    }

    // Get members count
    const memberships = await WorkspaceMembership.find({ workspaceId, status: 'active' });
    const memberCount = memberships.length;
    const omniCount = memberships.filter(m => m.role === 'omni').length;
    const crewCount = memberships.filter(m => m.role === 'crew').length;

    res.json({
      stats: {
        totalTasks,
        byStatus,
        byPriority,
        openP0P1,
        completionPercent: Math.round(completionPercent * 100) / 100,
        statusIndicator,
        memberCount,
        omniCount,
        crewCount,
      },
      // Placeholder for activity timeline (can be enhanced later)
      activityTimeline: [],
    });
  } catch (error: any) {
    console.error('Get project pulse error:', error);
    res.status(500).json({ error: error.message || 'Failed to get project pulse' });
  }
});

// Org Admin: Invite new Omni to workspace
router.post('/:workspaceId/invites/omni', requireWorkspaceMember, requireOrgAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const userId = req.userId!;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Get workspace
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const existingMembership = await WorkspaceMembership.findOne({
        workspaceId,
        userId: existingUser._id,
      });
      if (existingMembership) {
        return res.status(400).json({ error: 'User is already a member of this workspace' });
      }
    }

    // Generate unique invite code
    const code = Math.random().toString(36).substring(2, 15).toUpperCase();

    // Create invite for Omni role (special handling)
    const invite = new Invite({
      orgId: null,
      workspaceId,
      email,
      invitedRole: 'omni',
      invitedSpecialization: null, // Omnis don't have specialization
      roleDecisionMode: 'fixed',
      createdByUserId: userId,
      createdByRole: 'org_admin',
      status: 'pending',
      code,
      expiresAt: null,
    });

    await invite.save();

    // Send email invite
    const inviter = await User.findById(userId);
    const emailResult = await sendWorkspaceInvite({
      to: email,
      workspaceName: workspace.name,
      inviterName: inviter?.name || 'Org Admin',
      inviteCode: code,
    });

    // Create notification if user exists
    if (existingUser) {
      await createNotification({
        userId: existingUser._id,
        workspaceId,
        type: 'INVITE',
        entityId: invite._id,
        message: `You've been invited as Omni to join "${workspace.name}"`,
      });
    }

    res.status(201).json({
      invite: {
        _id: invite._id,
        code: invite.code,
        workspaceId: invite.workspaceId,
        createdAt: invite.createdAt,
        role: 'omni', // Indicate this is for Omni role
      },
      emailSent: emailResult.success,
      message: emailResult.success
        ? 'Omni invite sent successfully'
        : 'Invite created but email could not be sent. Please share the invite code manually.',
    });
  } catch (error: any) {
    console.error('Invite Omni error:', error);
    res.status(500).json({ error: error.message || 'Failed to send Omni invite' });
  }
});

export default router;

