import express, { Response } from 'express';
import { DirectMessage } from '../models/DirectMessage';
import { Message } from '../models/Message';
import { WorkspaceMembership } from '../models/WorkspaceMembership';
import { Organization } from '../models/Organization';
import { OrgAdmin } from '../models/OrgAdmin';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../services/auditService';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * Validate that participants share at least one workspace or same org
 */
async function validateParticipants(participants: string[], userId: string): Promise<{ valid: boolean; error?: string; sharedWorkspaces?: any[] }> {
  if (participants.length < 2) {
    return { valid: false, error: 'At least 2 participants required' };
  }

  // Ensure current user is in participants
  if (!participants.includes(userId)) {
    participants.push(userId);
  }

  // Get all workspace memberships for all participants
  const memberships = await WorkspaceMembership.find({
    userId: { $in: participants },
    status: 'active',
  });

  // Group by workspaceId
  const workspaceMap = new Map<string, Set<string>>();
  for (const membership of memberships) {
    const wsId = membership.workspaceId.toString();
    if (!workspaceMap.has(wsId)) {
      workspaceMap.set(wsId, new Set());
    }
    workspaceMap.get(wsId)!.add(membership.userId.toString());
  }

  // Find workspaces where all participants are members
  const sharedWorkspaces: any[] = [];
  for (const [workspaceId, userIds] of workspaceMap.entries()) {
    const hasAllParticipants = participants.every(p => userIds.has(p));
    if (hasAllParticipants) {
      sharedWorkspaces.push({ workspaceId });
    }
  }

  // Check if all participants are in the same org
  const userOrgs = await OrgAdmin.find({
    userId: { $in: participants },
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
    const hasAllParticipants = participants.every(p => userIds.has(p));
    if (hasAllParticipants) {
      sharedOrg = true;
      break;
    }
  }

  if (sharedWorkspaces.length === 0 && !sharedOrg) {
    return {
      valid: false,
      error: 'Participants must share at least one workspace or be in the same organization',
    };
  }

  return { valid: true, sharedWorkspaces };
}

// Create or get existing DM
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { participants, workspaceId } = req.body;

    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ error: 'Participants array is required' });
    }

    // Validate participants
    const validation = await validateParticipants(participants, userId.toString());
    if (!validation.valid) {
      return res.status(403).json({ error: validation.error });
    }

    // Ensure current user is included
    const allParticipants = [...new Set([...participants, userId.toString()])].sort();

    // Check if DM already exists
    let dm = await DirectMessage.findOne({
      participants: { $all: allParticipants, $size: allParticipants.length },
    });

    if (!dm) {
      // Determine if workspace-scoped
      const isWorkspaceScoped = workspaceId && validation.sharedWorkspaces?.some(ws => ws.workspaceId === workspaceId);

      dm = new DirectMessage({
        participants: allParticipants,
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
        detail: { participants: allParticipants, isWorkspaceScoped: !!isWorkspaceScoped },
      });
    }

    res.status(201).json({
      dm: {
        _id: dm._id,
        participants: dm.participants,
        isWorkspaceScoped: dm.isWorkspaceScoped,
        workspaceId: dm.workspaceId,
        createdAt: dm.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Create DM error:', error);
    res.status(500).json({ error: error.message || 'Failed to create DM' });
  }
});

// Get all DMs for current user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const dms = await DirectMessage.find({
      participants: userId,
    })
      .populate('participants', 'name email')
      .sort({ updatedAt: -1 });

    res.json({
      dms: dms.map(dm => ({
        _id: dm._id,
        participants: dm.participants,
        lastMessageAt: dm.updatedAt,
        workspaceId: dm.workspaceId
      }))
    });
  } catch (error: any) {
    console.error('Get DMs error:', error);
    res.status(500).json({ error: error.message || 'Failed to get DMs' });
  }
});

// Get DM messages
router.get('/:dmId/messages', async (req: AuthRequest, res: Response) => {
  try {
    const { dmId } = req.params;
    const userId = req.userId!;

    const dm = await DirectMessage.findById(dmId);
    if (!dm) {
      return res.status(404).json({ error: 'DM not found' });
    }

    // Verify user is a participant
    if (!dm.participants.some(p => p.toString() === userId.toString())) {
      return res.status(403).json({ error: 'Not a participant in this DM' });
    }

    // Get messages for this DM
    // Note: We need to store DM messages separately or use a channelId field
    // For now, assuming messages have a dmId field or we use a special channel structure
    const messages = await Message.find({
      channelId: dmId, // Assuming we use channelId to reference DM
    })
      .populate('senderId', 'name email')
      .sort({ createdAt: 1 })
      .lean();

    res.json({
      dm: {
        _id: dm._id,
        participants: dm.participants,
        isWorkspaceScoped: dm.isWorkspaceScoped,
        workspaceId: dm.workspaceId,
      },
      messages: messages.map((msg: any) => ({
        _id: msg._id,
        sender: {
          _id: msg.senderId._id,
          name: msg.senderId.name,
          email: msg.senderId.email,
        },
        content: msg.content,
        allowAi: msg.allowAi || false,
        attachments: msg.attachments || [],
        createdAt: msg.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Get DM messages error:', error);
    res.status(500).json({ error: error.message || 'Failed to get DM messages' });
  }
});

// Send message to DM (with allowAi flag)
router.post('/:dmId/messages', async (req: AuthRequest, res: Response) => {
  try {
    const { dmId } = req.params;
    const userId = req.userId!;
    const { text, attachments = [], allowAi = false } = req.body;

    if (!text && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: 'Message content or attachments required' });
    }

    const dm = await DirectMessage.findById(dmId);
    if (!dm) {
      return res.status(404).json({ error: 'DM not found' });
    }

    // Verify user is a participant
    if (!dm.participants.some(p => p.toString() === userId.toString())) {
      return res.status(403).json({ error: 'Not a participant in this DM' });
    }

    // Create message
    // Note: We may need to adjust Message model to support DMs
    // For now, using channelId to reference DM
    const message = new Message({
      workspaceId: dm.workspaceId || null,
      channelId: dmId, // Using DM ID as channelId
      senderId: userId,
      content: text || '',
      attachments,
      allowAi: allowAi || false, // Add this field to Message model
    });

    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'name email')
      .lean();

    const sender = (populatedMessage as any).senderId;

    // Audit log if AI is enabled
    if (allowAi) {
      await createAuditLog({
        actorUserId: userId.toString(),
        action: 'ai_read_message',
        resourceType: 'message',
        resourceId: message._id.toString(),
        detail: { dmId, allowAi: true },
      });
    }

    res.status(201).json({
      message: {
        _id: populatedMessage!._id,
        sender: {
          _id: sender._id,
          name: sender.name,
          email: sender.email,
        },
        content: populatedMessage!.content,
        attachments: populatedMessage!.attachments || [],
        allowAi: allowAi,
        createdAt: populatedMessage!.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Send DM message error:', error);
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
});

export default router;
