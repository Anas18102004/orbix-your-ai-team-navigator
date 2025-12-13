/**
 * AI Context Docs API
 * 
 * Allows fetching aiContextDocs (transcripts, summaries) for meetings.
 */
import express, { Response } from 'express';
import { AIContextDoc } from '../models/AIContextDoc';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireWorkspaceMember } from '../middleware/workspaceAuth';

const router = express.Router();

router.use(authenticate);

// Get AI context doc by ID
router.get('/workspaces/:workspaceId/ai-context/:docId', requireWorkspaceMember, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, docId } = req.params;

    const doc = await AIContextDoc.findOne({
      _id: docId,
      workspaceId,
    }).lean();

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      _id: doc._id,
      type: doc.type,
      text: doc.text,
      metadata: doc.metadata,
      createdAt: doc.createdAt,
    });
  } catch (error: any) {
    console.error('Get AI context error:', error);
    res.status(500).json({ error: error.message || 'Failed to get document' });
  }
});

export default router;
