import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { WorkspaceMembership } from '../models/WorkspaceMembership';
import { OrgAdmin } from '../models/OrgAdmin';
import { AuthRequest } from './auth';

export const requireWorkspaceMember = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const workspaceId = req.params.workspaceId || req.body.workspaceId;
    const userId = req.userId;

    if (!workspaceId || !userId) {
      return res.status(400).json({ error: 'Workspace ID and user ID required' });
    }

    const membership = await WorkspaceMembership.findOne({
      workspaceId,
      userId,
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this workspace' });
    }

    // Attach membership info to request for role checks
    (req as any).membership = membership;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Error checking workspace membership' });
  }
};

export const requireOmni = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const membership = (req as any).membership;

    if (!membership || membership.role !== 'omni') {
      return res.status(403).json({ error: 'Omni role required' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Error checking role' });
  }
};

export const requireOrgAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const orgAdmin = await OrgAdmin.findOne({ userId });
    if (!orgAdmin) {
      return res.status(403).json({ error: 'Org Admin role required' });
    }

    (req as any).isOrgAdmin = true;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Error checking org admin role' });
  }
};

export const requireOmniOrOrgAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const membership = (req as any).membership;
    const userId = req.userId;
    const workspaceId = req.params.workspaceId || req.body.workspaceId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user is org admin (org admins have access to all workspaces in their org)
    const orgAdmin = await OrgAdmin.findOne({ userId });
    if (orgAdmin) {
      // If workspaceId is provided, verify workspace belongs to org admin's organization
      if (workspaceId && orgAdmin.organizationId) {
        const { Workspace } = await import('../models/Workspace');
        const workspace = await Workspace.findById(workspaceId);
        if (workspace && workspace.orgId && workspace.orgId.toString() === orgAdmin.organizationId.toString()) {
          (req as any).isOrgAdmin = true;
          return next();
        }
      } else if (!workspaceId) {
        // No workspace context, org admin can proceed
        (req as any).isOrgAdmin = true;
        return next();
      }
    }

    // Check if user is omni in this workspace
    if (membership && membership.role === 'omni') {
      return next();
    }

    return res.status(403).json({ error: 'Omni or Org Admin role required' });
  } catch (error) {
    return res.status(500).json({ error: 'Error checking role' });
  }
};

// Helper function to check if workspace has at least one Omni
export const ensureWorkspaceHasOmni = async (
  workspaceId: mongoose.Types.ObjectId,
  excludeUserId?: mongoose.Types.ObjectId
): Promise<boolean> => {
  const query: any = { workspaceId, role: 'omni' };
  if (excludeUserId) {
    query.userId = { $ne: excludeUserId };
  }
  const omniCount = await WorkspaceMembership.countDocuments(query);
  return omniCount > 0;
};

