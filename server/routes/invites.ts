import express, { Response } from 'express';
import { Invite } from '../models/Invite';
import { WorkspaceMembership } from '../models/WorkspaceMembership';
import { Channel } from '../models/Channel';
import { OrgAdmin } from '../models/OrgAdmin';
import { Organization } from '../models/Organization';
import { Workspace } from '../models/Workspace';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireWorkspaceMember, requireOmni, requireOmniOrOrgAdmin, requireOrgAdmin } from '../middleware/workspaceAuth';
import { createNotification } from '../services/notificationService';
import { sendWorkspaceInvite } from '../services/emailService';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Helper function to validate invite constraints
function validateInviteConstraints(
  createdByRole: 'org_admin' | 'omni',
  invitedRole: 'org_admin' | 'omni' | 'crew',
  roleDecisionMode: 'fixed' | 'pending',
  invitedSpecialization: string | null
): { valid: boolean; error?: string } {
  // If createdByRole is 'omni', invitedRole MUST be 'crew'
  if (createdByRole === 'omni' && invitedRole !== 'crew') {
    return { valid: false, error: 'Omni can only invite crew members' };
  }

  // If invitedRole is 'org_admin' or 'omni', roleDecisionMode MUST be 'fixed'
  if ((invitedRole === 'org_admin' || invitedRole === 'omni') && roleDecisionMode !== 'fixed') {
    return { valid: false, error: 'Org Admin and Omni roles must have fixed role decision mode' };
  }

  // If roleDecisionMode is 'pending', invitedRole MUST be 'crew'
  if (roleDecisionMode === 'pending' && invitedRole !== 'crew') {
    return { valid: false, error: 'Pending role decision is only allowed for crew members' };
  }

  // If roleDecisionMode is 'pending', specialization should be null
  if (roleDecisionMode === 'pending' && invitedSpecialization !== null) {
    return { valid: false, error: 'Pending role decision cannot have a specialization set' };
  }

  return { valid: true };
}

// Create invite (unified endpoint for org admin and omni)
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const {
      email,
      invitedRole,
      invitedSpecialization,
      roleDecisionMode = 'fixed',
      workspaceId,
      orgId,
    } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Determine createdByRole
    const orgAdmin = await OrgAdmin.findOne({ userId });
    const createdByRole: 'org_admin' | 'omni' = orgAdmin ? 'org_admin' : 'omni';

    // If omni, require workspaceId and check membership
    if (createdByRole === 'omni') {
      if (!workspaceId) {
        return res.status(400).json({ error: 'Workspace ID is required for Omni invites' });
      }

      // Check if user is omni in this workspace
      const membership = await WorkspaceMembership.findOne({
        workspaceId,
        userId,
        role: 'omni',
        status: 'active',
      });

      if (!membership) {
        return res.status(403).json({ error: 'Omni role required in this workspace' });
      }

      // Omni can only invite crew
      if (invitedRole !== 'crew') {
        return res.status(403).json({ error: 'Omni can only invite crew members' });
      }
    }

    // Validate constraints
    const validation = validateInviteConstraints(
      createdByRole,
      invitedRole,
      roleDecisionMode,
      invitedSpecialization || null
    );

    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Validate specialization enum
    const validSpecializations = ['backend', 'frontend', 'qa', 'devops', 'pm', 'design', null];
    if (invitedSpecialization !== undefined && invitedSpecialization !== null && !validSpecializations.includes(invitedSpecialization)) {
      return res.status(400).json({ error: 'Invalid specialization' });
    }

    // Check if user already exists and is already a member
    const existingUser = await User.findOne({ email });
    if (existingUser && workspaceId) {
      const existingMembership = await WorkspaceMembership.findOne({
        workspaceId,
        userId: existingUser._id,
        status: 'active',
      });
      if (existingMembership) {
        return res.status(400).json({ error: 'User is already a member of this workspace' });
      }
    }

    // Generate unique invite code
    const code = Math.random().toString(36).substring(2, 15).toUpperCase();

    // Create invite
    const invite = new Invite({
      orgId: orgId || null,
      workspaceId: workspaceId || null,
      email,
      invitedRole,
      invitedSpecialization: invitedSpecialization || null,
      roleDecisionMode,
      createdByUserId: userId,
      createdByRole,
      status: 'pending',
      code,
      expiresAt: null, // No expiration for now
    });

    await invite.save();

    // Send email invite if workspace or org exists
    let emailSent = false;
    if (workspaceId) {
      const workspace = await Workspace.findById(workspaceId);
      if (workspace) {
        const inviter = await User.findById(userId);
        if (inviter) {
          const emailResult = await sendWorkspaceInvite({
            to: email,
            workspaceName: workspace.name,
            inviterName: inviter.name,
            inviteCode: code,
          });
          emailSent = emailResult.success;
        }
      }
    }

    // Create notification if user exists
    if (existingUser) {
      const workspace = workspaceId ? await Workspace.findById(workspaceId) : null;
      const inviter = await User.findById(userId);
      if (workspace && inviter) {
        await createNotification({
          userId: existingUser._id,
          workspaceId: workspaceId || undefined,
          type: 'INVITE',
          entityId: invite._id,
          message: `${inviter.name} invited you to join "${workspace.name}"`,
        });
      }
    }

    res.status(201).json({
      invite: {
        _id: invite._id,
        code: invite.code,
        email: invite.email,
        invitedRole: invite.invitedRole,
        invitedSpecialization: invite.invitedSpecialization,
        roleDecisionMode: invite.roleDecisionMode,
        workspaceId: invite.workspaceId,
        orgId: invite.orgId,
        createdAt: invite.createdAt,
      },
      emailSent,
      message: emailSent
        ? 'Invite sent successfully'
        : 'Invite created but email could not be sent. Please share the invite code manually.',
    });
  } catch (error: any) {
    console.error('Create invite error:', error);
    res.status(500).json({ error: error.message || 'Failed to create invite' });
  }
});

// Accept invite
router.post('/:inviteId/accept', async (req: AuthRequest, res: Response) => {
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

    // Check if already accepted
    if (invite.status === 'accepted') {
      return res.status(400).json({ error: 'Invite has already been accepted' });
    }

    // Handle workspace-level invite
    if (invite.workspaceId) {
      // Check if already a member
      const existingMembership = await WorkspaceMembership.findOne({
        workspaceId: invite.workspaceId,
        userId,
        status: 'active',
      });

      if (existingMembership) {
        return res.status(400).json({ error: 'Already a member of this workspace' });
      }

      // Determine role and specialization based on invite
      let role: 'omni' | 'crew' = 'crew';
      let specialization: 'backend' | 'frontend' | 'qa' | 'devops' | 'pm' | 'design' | null = null;
      let pendingRoleDecision = false;

      if (invite.roleDecisionMode === 'fixed') {
        // Fixed role: use invite values
        role = invite.invitedRole === 'omni' ? 'omni' : 'crew';
        specialization = invite.invitedSpecialization;
        pendingRoleDecision = false;
      } else if (invite.roleDecisionMode === 'pending') {
        // Pending: set as crew with no specialization, mark as pending
        role = 'crew';
        specialization = null;
        pendingRoleDecision = true;
      }

      // Create membership
      const membership = new WorkspaceMembership({
        workspaceId: invite.workspaceId,
        userId,
        role,
        specialization,
        pendingRoleDecision,
        status: 'active',
      });

      await membership.save();

      // Update workspace omniIds if role is omni
      if (role === 'omni') {
        await Workspace.updateOne(
          { _id: invite.workspaceId },
          { $addToSet: { omniIds: userId } }
        );
      }

      // Get workspace to use its name for channel
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

      // Add user to all channels in the workspace (including #general)
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

      // Get workspace

      // Mark invite as accepted
      invite.status = 'accepted';
      await invite.save();

      // Mark related notification as read
      await Notification.updateMany(
        { userId, type: 'INVITE', entityId: invite._id },
        { read: true }
      );

      // Notify inviter
      const inviter = await User.findById(invite.createdByUserId);
      const joinedUser = await User.findById(userId);
      if (inviter && joinedUser && workspace) {
        await createNotification({
          userId: invite.createdByUserId,
          workspaceId: invite.workspaceId,
          type: 'INVITE',
          entityId: membership._id,
          message: `${joinedUser.name} accepted your invitation to join "${workspace.name}"`,
        });
      }

      res.status(200).json({
        workspace: {
          _id: workspace!._id,
          name: workspace!.name,
          description: workspace!.description,
          createdBy: workspace!.createdBy,
          createdAt: workspace!.createdAt,
          role: membership.role,
        },
        membership: {
          role: membership.role,
          specialization: membership.specialization,
          pendingRoleDecision: membership.pendingRoleDecision,
        },
        message: 'Successfully joined workspace',
      });
    } else if (invite.orgId && invite.invitedRole === 'org_admin') {
      // Handle org-level invite for org admin
      // Check if already an org admin
      const existingOrgAdmin = await OrgAdmin.findOne({
        userId,
        organizationId: invite.orgId,
      });

      if (existingOrgAdmin) {
        return res.status(400).json({ error: 'Already an admin of this organization' });
      }

      // Create org admin record
      const orgAdmin = new OrgAdmin({
        userId,
        organizationId: invite.orgId,
      });

      await orgAdmin.save();

      // Mark invite as accepted
      invite.status = 'accepted';
      await invite.save();

      const organization = await Organization.findById(invite.orgId);

      res.status(200).json({
        organization: {
          _id: organization!._id,
          name: organization!.name,
        },
        message: 'Successfully joined organization as admin',
      });
    } else {
      return res.status(400).json({ error: 'Invalid invite type' });
    }
  } catch (error: any) {
    console.error('Accept invite error:', error);
    res.status(500).json({ error: error.message || 'Failed to accept invite' });
  }
});

// Join workspace by code
router.post('/join-by-code', async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    const userId = req.userId!;

    if (!code) {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    // Find invite
    const invite = await Invite.findOne({ code, status: 'pending' });
    if (!invite) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    // Check if expired
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invite code has expired' });
    }

    // Use the accept endpoint logic
    // For simplicity, we'll call the accept logic directly
    if (invite.workspaceId) {
      // Check if already a member
      const existingMembership = await WorkspaceMembership.findOne({
        workspaceId: invite.workspaceId,
        userId,
        status: 'active',
      });

      if (existingMembership) {
        return res.status(400).json({ error: 'Already a member of this workspace' });
      }

      // Determine role and specialization
      let role: 'omni' | 'crew' = 'crew';
      let specialization: 'backend' | 'frontend' | 'qa' | 'devops' | 'pm' | 'design' | null = null;
      let pendingRoleDecision = false;

      if (invite.roleDecisionMode === 'fixed') {
        role = invite.invitedRole === 'omni' ? 'omni' : 'crew';
        specialization = invite.invitedSpecialization;
        pendingRoleDecision = false;
      } else if (invite.roleDecisionMode === 'pending') {
        role = 'crew';
        specialization = null;
        pendingRoleDecision = true;
      }

      const membership = new WorkspaceMembership({
        workspaceId: invite.workspaceId,
        userId,
        role,
        specialization,
        pendingRoleDecision,
        status: 'active',
      });

      await membership.save();

      if (role === 'omni') {
        await Workspace.updateOne(
          { _id: invite.workspaceId },
          { $addToSet: { omniIds: userId } }
        );
      }

      await Channel.updateMany(
        { workspaceId: invite.workspaceId, type: 'group' },
        { $addToSet: { memberIds: userId } }
      );

      const workspace = await Workspace.findById(invite.workspaceId);

      invite.status = 'accepted';
      await invite.save();

      res.status(201).json({
        workspace: {
          _id: workspace!._id,
          name: workspace!.name,
          description: workspace!.description,
          createdBy: workspace!.createdBy,
          createdAt: workspace!.createdAt,
          role: membership.role,
        },
        membership: {
          role: membership.role,
          specialization: membership.specialization,
          pendingRoleDecision: membership.pendingRoleDecision,
        },
      });
    } else {
      return res.status(400).json({ error: 'Invalid invite code' });
    }
  } catch (error: any) {
    console.error('Join by code error:', error);
    res.status(500).json({ error: error.message || 'Failed to join workspace' });
  }
});

// Finalize pending role/specialization
router.patch('/:workspaceId/members/:memberId/finalize-role', requireWorkspaceMember, requireOmniOrOrgAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, memberId } = req.params;
    const userId = req.userId!;
    const { specialization, role } = req.body;

    const isOrgAdmin = await OrgAdmin.findOne({ userId });
    const membership = await WorkspaceMembership.findOne({
      workspaceId,
      userId: memberId,
      status: 'active',
    });

    if (!membership) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (!membership.pendingRoleDecision) {
      return res.status(400).json({ error: 'Member does not have a pending role decision' });
    }

    // Omni can only set specialization, not promote to omni
    if (!isOrgAdmin && role && role === 'omni') {
      return res.status(403).json({ error: 'Omni cannot promote members to Omni' });
    }

    // Validate specialization
    const validSpecializations = ['backend', 'frontend', 'qa', 'devops', 'pm', 'design', null];
    if (specialization !== undefined && specialization !== null && !validSpecializations.includes(specialization)) {
      return res.status(400).json({ error: 'Invalid specialization' });
    }

    // Update membership
    if (specialization !== undefined) {
      membership.specialization = specialization;
    }

    if (isOrgAdmin && role) {
      // Only org admin can change role
      if (role === 'omni') {
        membership.role = 'omni';
        // Add to workspace omniIds
        await Workspace.updateOne(
          { _id: workspaceId },
          { $addToSet: { omniIds: memberId } }
        );
      } else if (role === 'crew') {
        membership.role = 'crew';
        // Remove from workspace omniIds if was omni
        await Workspace.updateOne(
          { _id: workspaceId },
          { $pull: { omniIds: memberId } }
        );
      }
    }

    membership.pendingRoleDecision = false;
    await membership.save();

    res.json({
      success: true,
      member: {
        _id: membership._id,
        role: membership.role,
        specialization: membership.specialization,
        pendingRoleDecision: membership.pendingRoleDecision,
      },
      message: 'Role and specialization finalized',
    });
  } catch (error: any) {
    console.error('Finalize role error:', error);
    res.status(500).json({ error: error.message || 'Failed to finalize role' });
  }
});

// Get pending members
router.get('/:workspaceId/pending-members', requireWorkspaceMember, requireOmniOrOrgAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;

    const pendingMembers = await WorkspaceMembership.find({
      workspaceId,
      pendingRoleDecision: true,
      status: 'active',
    }).populate('userId', 'name email');

    const members = pendingMembers.map((mem) => {
      const user = mem.userId as any;
      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: mem.role,
        specialization: mem.specialization,
        selfPreferredSpecialization: mem.selfPreferredSpecialization,
        joinedAt: mem.createdAt,
      };
    });

    res.json({ members });
  } catch (error: any) {
    console.error('Get pending members error:', error);
    res.status(500).json({ error: error.message || 'Failed to get pending members' });
  }
});

export default router;

