import express, { Response } from 'express';
import { Organization } from '../models/Organization';
import { OrgAdmin } from '../models/OrgAdmin';
import { Workspace } from '../models/Workspace';
import { WorkspaceMembership } from '../models/WorkspaceMembership';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireOrgAdmin } from '../middleware/workspaceAuth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create organization
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    const userId = req.userId!;

    if (!name) {
      return res.status(400).json({ error: 'Organization name is required' });
    }

    // Create organization
    const organization = new Organization({
      name,
      createdBy: userId,
    });

    await organization.save();

    // Create org admin record
    const orgAdmin = new OrgAdmin({
      userId,
      organizationId: organization._id,
    });

    await orgAdmin.save();

    res.status(201).json({
      organization: {
        _id: organization._id,
        name: organization.name,
        createdBy: organization.createdBy,
        createdAt: organization.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Create organization error:', error);
    res.status(500).json({ error: error.message || 'Failed to create organization' });
  }
});

// Get all organizations for current user (as org admin)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const orgAdmins = await OrgAdmin.find({ userId }).populate('organizationId');
    const organizations = orgAdmins.map((orgAdmin) => {
      const org = orgAdmin.organizationId as any;
      return {
        _id: org._id,
        name: org.name,
        createdBy: org.createdBy,
        createdAt: org.createdAt,
      };
    });

    res.json({ organizations });
  } catch (error: any) {
    console.error('Get organizations error:', error);
    res.status(500).json({ error: error.message || 'Failed to get organizations' });
  }
});

// Get single organization with workspaces
router.get('/:id', requireOrgAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.params.id;
    const organization = await Organization.findById(orgId);

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Get all workspaces in this organization
    const workspaces = await Workspace.find({ orgId });

    // Get workspace stats
    const workspaceStats = await Promise.all(
      workspaces.map(async (workspace) => {
        const memberships = await WorkspaceMembership.find({ 
          workspaceId: workspace._id, 
          status: 'active' 
        });
        const omniCount = memberships.filter(m => m.role === 'omni').length;
        const crewCount = memberships.filter(m => m.role === 'crew').length;
        
        return {
          _id: workspace._id,
          name: workspace.name,
          description: workspace.description,
          omniCount,
          crewCount,
          totalMembers: memberships.length,
          hasProjectProfile: !!workspace.projectProfile,
        };
      })
    );

    res.json({
      organization: {
        _id: organization._id,
        name: organization.name,
        createdBy: organization.createdBy,
        createdAt: organization.createdAt,
      },
      workspaces: workspaceStats,
    });
  } catch (error: any) {
    console.error('Get organization error:', error);
    res.status(500).json({ error: error.message || 'Failed to get organization' });
  }
});

export default router;

