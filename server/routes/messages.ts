import express, { Response } from 'express';
import { Message } from '../models/Message';
import { Channel } from '../models/Channel';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireWorkspaceMember } from '../middleware/workspaceAuth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get messages for a channel
router.get('/:workspaceId/channels/:channelId/messages', requireWorkspaceMember, async (req: AuthRequest, res: Response) => {
  try {
    const { channelId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    // Verify channel exists and user has access
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const messages = await Message.find({ channelId })
      .populate('senderId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Message.countDocuments({ channelId });

    res.json({
      messages: messages.reverse().map((msg) => {
        const sender = msg.senderId as any;
        return {
          _id: msg._id,
          workspaceId: msg.workspaceId,
          channelId: msg.channelId,
          sender: {
            _id: sender._id,
            name: sender.name,
            email: sender.email,
          },
        content: msg.content,
        attachments: msg.attachments,
        allowAi: msg.allowAi || false,
        createdAt: msg.createdAt,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: error.message || 'Failed to get messages' });
  }
});

// Create message
router.post('/:workspaceId/channels/:channelId/messages', requireWorkspaceMember, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, channelId } = req.params;
    const userId = req.userId!;
    const { content, attachments = [] } = req.body;

    if (!content && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: 'Message content or attachments required' });
    }

    // Verify channel exists
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Check if AI should process this message
    const shouldProcessAI = channel.aiMode === 'active' && (req.body.allowAi === true);
    
    // For DMs (private channels), only process if explicitly allowed
    if (channel.type === 'private_channel' && !req.body.allowAi) {
      // DMs default to no AI processing unless explicitly allowed
    }

    const message = new Message({
      workspaceId: workspaceId || null, // Can be null for global DMs
      channelId,
      senderId: userId,
      content: content || '',
      attachments,
      allowAi: req.body.allowAi || false, // Default to false for privacy
    });

    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'name email');

    const sender = populatedMessage!.senderId as any;

    // Log AI read event if AI is processing
    if (shouldProcessAI || req.body.allowAi) {
      const { createAuditLog } = await import('../services/auditService');
      await createAuditLog({
        actorUserId: userId.toString(),
        action: 'ai_read_message',
        resourceType: 'message',
        resourceId: message._id.toString(),
        detail: {
          channelId: channelId.toString(),
          channelName: channel.name,
          channelType: channel.type,
          aiMode: channel.aiMode,
          allowAi: req.body.allowAi || false,
        },
      });
    }

    res.status(201).json({
      message: {
        _id: populatedMessage!._id,
        workspaceId: populatedMessage!.workspaceId,
        channelId: populatedMessage!.channelId,
        sender: {
          _id: sender._id,
          name: sender.name,
          email: sender.email,
        },
        content: populatedMessage!.content,
        attachments: populatedMessage!.attachments,
        allowAi: populatedMessage!.allowAi,
        createdAt: populatedMessage!.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Create message error:', error);
    res.status(500).json({ error: error.message || 'Failed to create message' });
  }
});

export default router;

