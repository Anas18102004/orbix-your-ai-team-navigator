import express, { Response } from 'express';
import { DirectMessage } from '../models/DirectMessage';
import { Channel } from '../models/Channel';
import { WorkspaceMembership } from '../models/WorkspaceMembership';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireWorkspaceMember, requireOmniOrOrgAdmin } from '../middleware/workspaceAuth';
import { createAuditLog } from '../services/auditService';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * New Chat endpoint - creates DM or private_channel based on participants
 * POST /api/chats/new
 * Body: { participants: string[], workspaceId?: string }
 */
router.post('/new', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { participants, workspaceId } = req.body;

    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ error: 'Participants array is required' });
    }

    // Ensure current user is included
    const allParticipants = [...new Set([...participants, userId.toString()])];

    // Always create DMs (private channels are created separately by Omni+)
    // Create or get DM (validates participants share workspace/org)
    // For DMs, we need to check participant sharing
    const memberships = await WorkspaceMembership.find({
      userId: { $in: allParticipants },
      status: 'active',
    });

    const workspaceMap = new Map<string, Set<string>>();
    for (const membership of memberships) {
      const wsId = membership.workspaceId.toString();
      if (!workspaceMap.has(wsId)) {
        workspaceMap.set(wsId, new Set());
      }
      workspaceMap.get(wsId)!.add(membership.userId.toString());
    }

    const sharedWorkspaces: any[] = [];
    for (const [wsId, userIds] of workspaceMap.entries()) {
      const hasAllParticipants = allParticipants.every(p => userIds.has(p));
      if (hasAllParticipants) {
        sharedWorkspaces.push({ workspaceId: wsId });
      }
    }

    // Check org membership as fallback
    const { OrgAdmin } = await import('../models/OrgAdmin');
    const userOrgs = await OrgAdmin.find({
      userId: { $in: allParticipants },
    });

    const orgMap = new Map<string, Set<string>>();
    for (const orgAdmin of userOrgs) {
      if (orgAdmin.organizationId) {
        const orgId = orgAdmin.organizationId.toString();
        if (!orgMap.has(orgId)) {
          orgMap.set(orgId, new Set());
        }
        orgMap.get(orgId)!.add(orgAdmin.userId.toString());
      }
    }

    let sharedOrg = false;
    for (const [orgId, userIds] of orgMap.entries()) {
      const hasAllParticipants = allParticipants.every(p => userIds.has(p));
      if (hasAllParticipants) {
        sharedOrg = true;
        break;
      }
    }

    if (sharedWorkspaces.length === 0 && !sharedOrg) {
      return res.status(403).json({
        error: 'Participants must share at least one workspace or be in the same organization to create a DM',
      });
    }

    // Sort participants for consistent lookup
    const sortedParticipants = allParticipants.sort();

    // Check if DM already exists
    let dm = await DirectMessage.findOne({
      participants: { $all: sortedParticipants, $size: sortedParticipants.length },
    });

    if (!dm) {
      const isWorkspaceScoped = workspaceId && sharedWorkspaces.some(ws => ws.workspaceId === workspaceId);

      dm = new DirectMessage({
        participants: sortedParticipants,
        isWorkspaceScoped: !!isWorkspaceScoped,
        workspaceId: isWorkspaceScoped ? workspaceId : null,
      });

      await dm.save();

      // Audit log
      await createAuditLog({
        actorUserId: userId.toString(),
        action: 'dm_created',
        resourceType: 'message',
        resourceId: dm._id.toString(),
        detail: { participants: sortedParticipants, isWorkspaceScoped: !!isWorkspaceScoped },
      });
    }

    return res.status(201).json({
      type: 'dm',
      dm: {
        _id: dm._id,
        participants: dm.participants,
        isWorkspaceScoped: dm.isWorkspaceScoped,
        workspaceId: dm.workspaceId,
        createdAt: dm.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Create new chat error:', error);
    res.status(500).json({ error: error.message || 'Failed to create chat' });
  }
});

export default router;
