import express, { Response } from 'express';
import { WorkspaceMembership } from '../models/WorkspaceMembership';
import { OrgAdmin } from '../models/OrgAdmin';
import { Task } from '../models/Task';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireWorkspaceMember, requireOmni, requireOmniOrOrgAdmin, requireOrgAdmin, ensureWorkspaceHasOmni } from '../middleware/workspaceAuth';
import mongoose from 'mongoose';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get workspace members (Omni, Org Admin, or Crew can view)
router.get('/:workspaceId/members', requireWorkspaceMember, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const membership = (req as any).membership;
    const userId = req.userId!;

    // Check if user is org admin
    const isOrgAdmin = await OrgAdmin.findOne({ userId });
    const isOmni = membership.role === 'omni';

    // Only Omni and Org Admin can see full member list
    if (!isOrgAdmin && !isOmni) {
      return res.status(403).json({ error: 'Omni or Org Admin role required to view members' });
    }

    const memberships = await WorkspaceMembership.find({ workspaceId, status: 'active' })
      .populate('userId', 'name email')
      .sort({ role: 1, createdAt: 1 }); // Sort by role (omni first), then by join date

    const members = memberships.map((mem) => {
      const user = mem.userId as any;
      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: mem.role,
        specialization: mem.specialization,
        joinedAt: mem.createdAt,
      };
    });

    // Separate into groups
    const omnis = members.filter(m => m.role === 'omni');
    const crew = members.filter(m => m.role === 'crew');
    const pendingCrew = crew.filter(m => !m.specialization);

    res.json({
      members,
      omnis,
      crew,
      pendingCrew, // Crew without specialization
      stats: {
        total: members.length,
        omniCount: omnis.length,
        crewCount: crew.length,
        pendingCount: pendingCrew.length,
      }
    });
  } catch (error: any) {
    console.error('Get members error:', error);
    res.status(500).json({ error: error.message || 'Failed to get members' });
  }
});

// Remove member from workspace
router.delete('/:workspaceId/members/:memberId', requireWorkspaceMember, requireOmniOrOrgAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, memberId } = req.params;
    const userId = req.userId!;
    const membership = (req as any).membership;
    const isOrgAdmin = (req as any).isOrgAdmin;

    // Get the member to remove
    const memberToRemove = await WorkspaceMembership.findOne({
      workspaceId,
      userId: memberId,
      status: 'active',
    }).populate('userId', 'name email');

    if (!memberToRemove) {
      return res.status(404).json({ error: 'Member not found in this workspace' });
    }

    const memberRole = memberToRemove.role;
    const memberUser = memberToRemove.userId as any;

    // Permission checks
    if (!isOrgAdmin) {
      // Omni can only remove Crew
      if (memberRole !== 'crew') {
        return res.status(403).json({ error: 'Omni can only remove Crew members' });
      }
    }

    // Safety check: Ensure workspace has at least one Omni after removal
    if (memberRole === 'omni') {
      const hasOtherOmni = await ensureWorkspaceHasOmni(
        new mongoose.Types.ObjectId(workspaceId),
        new mongoose.Types.ObjectId(memberId)
      );

      if (!hasOtherOmni) {
        return res.status(400).json({
          error: 'Cannot remove the only Omni in the workspace. Please assign another Omni first.',
        });
      }
    }

    // Unassign all tasks assigned to this member
    await Task.updateMany(
      {
        workspaceId,
        assigneeId: memberId,
      },
      {
        $set: { assigneeId: null }, // Set to unassigned
      }
    );

    // Remove membership
    await WorkspaceMembership.deleteOne({ _id: memberToRemove._id });

    res.json({
      success: true,
      message: `${memberUser.name} has been removed from the workspace`,
      unassignedTasks: true, // Tasks have been unassigned
    });
  } catch (error: any) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: error.message || 'Failed to remove member' });
  }
});

// Assign/update specialization for a Crew member
router.patch('/:workspaceId/members/:memberId/specialization', requireWorkspaceMember, requireOmni, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, memberId } = req.params;
    const { specialization } = req.body;

    // Validate specialization
    const validSpecializations = ['backend', 'frontend', 'qa', 'devops', 'pm', 'design', 'mobile', 'data', 'security', 'other', null];
    if (specialization !== null && !validSpecializations.includes(specialization)) {
      return res.status(400).json({ error: 'Invalid specialization' });
    }

    // Get the member
    const member = await WorkspaceMembership.findOne({
      workspaceId,
      userId: memberId,
    }).populate('userId', 'name email');

    if (!member) {
      return res.status(404).json({ error: 'Member not found in this workspace' });
    }

    // Only Crew can have specialization assigned
    if (member.role !== 'crew') {
      return res.status(400).json({ error: 'Specialization can only be assigned to Crew members' });
    }

    // Update specialization
    member.specialization = specialization;
    await member.save();

    const user = member.userId as any;

    res.json({
      success: true,
      member: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: member.role,
        specialization: member.specialization,
      },
      message: specialization
        ? `Specialization "${specialization}" assigned to ${user.name}`
        : `Specialization removed from ${user.name}`,
    });
  } catch (error: any) {
    console.error('Assign specialization error:', error);
    res.status(500).json({ error: error.message || 'Failed to assign specialization' });
  }
});

// Promote Crew to Omni (Org Admin only, or Omni with safety check)
router.post('/:workspaceId/members/:memberId/promote', requireWorkspaceMember, requireOmniOrOrgAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, memberId } = req.params;
    const isOrgAdmin = (req as any).isOrgAdmin;

    // Only Org Admin can promote to Omni
    if (!isOrgAdmin) {
      return res.status(403).json({ error: 'Only Org Admin can promote members to Omni' });
    }

    const member = await WorkspaceMembership.findOne({
      workspaceId,
      userId: memberId,
    }).populate('userId', 'name email');

    if (!member) {
      return res.status(404).json({ error: 'Member not found in this workspace' });
    }

    if (member.role === 'omni') {
      return res.status(400).json({ error: 'Member is already an Omni' });
    }

    // Promote to Omni
    member.role = 'omni';
    // Keep specialization for reference, but Omni role takes precedence
    await member.save();

    const user = member.userId as any;

    res.json({
      success: true,
      member: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: member.role,
        specialization: member.specialization,
      },
      message: `${user.name} has been promoted to Omni`,
    });
  } catch (error: any) {
    console.error('Promote member error:', error);
    res.status(500).json({ error: error.message || 'Failed to promote member' });
  }
});

// Demote Omni to Crew (Org Admin only, with safety check)
router.post('/:workspaceId/members/:memberId/demote', requireWorkspaceMember, requireOrgAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, memberId } = req.params;

    const member = await WorkspaceMembership.findOne({
      workspaceId,
      userId: memberId,
    }).populate('userId', 'name email');

    if (!member) {
      return res.status(404).json({ error: 'Member not found in this workspace' });
    }

    if (member.role !== 'omni') {
      return res.status(400).json({ error: 'Member is not an Omni' });
    }

    // Safety check: Ensure workspace has at least one Omni after demotion
    const hasOtherOmni = await ensureWorkspaceHasOmni(
      new mongoose.Types.ObjectId(workspaceId),
      new mongoose.Types.ObjectId(memberId)
    );

    if (!hasOtherOmni) {
      return res.status(400).json({
        error: 'Cannot demote the only Omni in the workspace. Please assign another Omni first.',
      });
    }

    // Demote to Crew
    member.role = 'crew';
    // Keep existing specialization or set to null
    if (!member.specialization) {
      member.specialization = null;
    }
    await member.save();

    const user = member.userId as any;

    res.json({
      success: true,
      member: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: member.role,
        specialization: member.specialization,
      },
      message: `${user.name} has been demoted to Crew`,
    });
  } catch (error: any) {
    console.error('Demote member error:', error);
    res.status(500).json({ error: error.message || 'Failed to demote member' });
  }
});

export default router;
