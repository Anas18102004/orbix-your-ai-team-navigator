import express, { Response } from 'express';
import { Channel } from '../models/Channel';
import { Workspace } from '../models/Workspace';
import { WorkspaceMembership } from '../models/WorkspaceMembership';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireWorkspaceMember, requireOmniOrOrgAdmin } from '../middleware/workspaceAuth';
import { createAuditLog } from '../services/auditService';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create channel (Omni+ only)
router.post('/:workspaceId/channels', requireWorkspaceMember, requireOmniOrOrgAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const userId = req.userId!;
    const { name, displayName, type = 'channel', memberIds = [], aiMode = 'off' } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Channel name is required' });
    }

    // Validate type
    if (type !== 'channel' && type !== 'private_channel') {
      return res.status(400).json({ error: 'Invalid channel type. Must be "channel" or "private_channel"' });
    }

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Check for duplicate slug in workspace
    const existing = await Channel.findOne({ workspaceId, slug });
    if (existing) {
      return res.status(400).json({ error: 'Channel with this name already exists in workspace' });
    }

    const channel = new Channel({
      workspaceId,
      name,
      displayName: displayName || name,
      slug,
      type,
      memberIds: memberIds.length > 0 ? memberIds : [], // Empty means all workspace members
      aiMode,
    });

    await channel.save();

    // Audit log
    await createAuditLog({
      actorUserId: userId.toString(),
      action: 'channel_created',
      resourceType: 'channel',
      resourceId: channel._id.toString(),
      detail: { name, type, aiMode },
    });

    res.status(201).json({
      channel: {
        _id: channel._id,
        workspaceId: channel.workspaceId,
        name: channel.name,
        displayName: channel.displayName,
        slug: channel.slug,
        type: channel.type,
        memberIds: channel.memberIds,
        memberCount: channel.memberCount,
        aiMode: channel.aiMode,
        createdAt: channel.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Create channel error:', error);
    res.status(500).json({ error: error.message || 'Failed to create channel' });
  }
});

// Get channels for workspace (grouped by workspace)
router.get('/:workspaceId/channels', requireWorkspaceMember, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const userId = req.userId!;

    // Get workspace info
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Get all channels for this workspace
    // For channels (type: 'channel'), show all regardless of memberIds
    // For private_channels, only show if user is a member
    const allChannels = await Channel.find({
      workspaceId,
    }).sort({ createdAt: 1 });

    // Auto-healing: If no "general" channels exist, create default one
    const hasGeneralChannel = allChannels.some(ch => ch.type === 'channel');
    if (!hasGeneralChannel) {
      // Get all current members
      const allMemberships = await WorkspaceMembership.find({ workspaceId, status: 'active' });
      const allMemberIds = allMemberships.map(m => m.userId);

      const defaultChannel = new Channel({
        workspaceId,
        name: `#${workspace.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        displayName: workspace.name,
        slug: workspace.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        type: 'channel',
        memberIds: allMemberIds,
        memberCount: allMemberIds.length,
        aiMode: 'off',
      });

      await defaultChannel.save();
      allChannels.push(defaultChannel);
    }

    // Filter: show all 'channel' type, and 'private_channel' only if user is a member
    const channels = allChannels.filter(ch => {
      if (ch.type === 'channel') {
        return true; // Always show regular channels
      }
      if (ch.type === 'private_channel') {
        // Only show if user is in memberIds
        return ch.memberIds && ch.memberIds.some(id => id.toString() === userId.toString());
      }
      return false;
    });

    // For channels with empty memberIds, they include all workspace members
    const allMemberships = await WorkspaceMembership.find({ workspaceId, status: 'active' });
    const allMemberIds = allMemberships.map(m => m.userId);

    // Ensure user is in all channels (for channels with empty memberIds, they include everyone)
    // Also update memberCount
    for (const channel of channels) {
      if (channel.type === 'channel') {
        // If channel has no specific members, it includes all workspace members
        // Make sure current user is included
        if (!channel.memberIds || channel.memberIds.length === 0) {
          channel.memberIds = allMemberIds;
          channel.memberCount = allMemberIds.length;
          await channel.save();
        } else {
          // If channel has specific members, ensure user is included
          const userInChannel = channel.memberIds.some(id => id.toString() === userId.toString());
          if (!userInChannel) {
            channel.memberIds.push(userId);
            channel.memberCount = channel.memberIds.length;
            await channel.save();
          } else {
            // Just update memberCount
            channel.memberCount = channel.memberIds.length;
            await channel.save();
          }
        }
      }
    }

    res.json({
      workspace: {
        _id: workspace._id,
        name: workspace.name,
        description: workspace.description,
      },
      channels: channels.map((channel) => ({
        _id: channel._id,
        workspaceId: channel.workspaceId,
        name: channel.name,
        displayName: channel.displayName,
        slug: channel.slug,
        type: channel.type,
        memberIds: channel.memberIds,
        memberCount: channel.memberCount,
        aiMode: channel.aiMode,
        createdAt: channel.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Get channels error:', error);
    res.status(500).json({ error: error.message || 'Failed to get channels' });
  }
});

// Update channel AI mode (Omni+ only)
router.patch('/channels/:channelId', requireWorkspaceMember, requireOmniOrOrgAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { channelId } = req.params;
    const userId = req.userId!;
    const { aiMode } = req.body;

    if (!aiMode || (aiMode !== 'active' && aiMode !== 'off')) {
      return res.status(400).json({ error: 'Invalid aiMode. Must be "active" or "off"' });
    }

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Verify user has access to this workspace
    const membership = await WorkspaceMembership.findOne({
      workspaceId: channel.workspaceId,
      userId,
      status: 'active',
    });

    if (!membership || (membership.role !== 'omni' && !(req as any).isOrgAdmin)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const oldAiMode = channel.aiMode;
    channel.aiMode = aiMode;
    await channel.save();

    // Audit log
    await createAuditLog({
      actorUserId: userId.toString(),
      action: 'channel_ai_mode_updated',
      resourceType: 'channel',
      resourceId: channel._id.toString(),
      detail: { oldAiMode, newAiMode: aiMode, channelName: channel.name },
    });

    res.json({
      channel: {
        _id: channel._id,
        aiMode: channel.aiMode,
      },
    });
  } catch (error: any) {
    console.error('Update channel error:', error);
    res.status(500).json({ error: error.message || 'Failed to update channel' });
  }
});

export default router;

