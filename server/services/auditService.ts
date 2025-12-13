import { AuditLog } from '../models/AuditLog';
import { User } from '../models/User';
import { OrgAdmin } from '../models/OrgAdmin';
import { WorkspaceMembership } from '../models/WorkspaceMembership';

export interface AuditLogData {
  actorUserId: string;
  action: string;
  resourceType: 'workspace' | 'channel' | 'user' | 'invite' | 'message' | 'update' | 'meeting';
  resourceId?: string | null;
  detail?: Record<string, any>;
}

/**
 * Determine actor role from user context
 */
async function getActorRole(userId: string, workspaceId?: string): Promise<'org_admin' | 'omni' | 'crew'> {
  // Check if user is org admin
  const orgAdmin = await OrgAdmin.findOne({ userId });
  if (orgAdmin) {
    return 'org_admin';
  }

  // Check workspace membership for role
  if (workspaceId) {
    const membership = await WorkspaceMembership.findOne({
      userId,
      workspaceId,
      status: 'active',
    });
    if (membership) {
      return membership.role;
    }
  }

  // Default to crew if no specific role found
  return 'crew';
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    const actorRole = await getActorRole(data.actorUserId);

    const auditLog = new AuditLog({
      actorUserId: data.actorUserId,
      actorRole,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId || null,
      detail: data.detail || {},
    });

    await auditLog.save();
  } catch (error) {
    // Don't throw - audit logging should not break the main flow
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Query audit logs with filters
 */
export async function getAuditLogs(filters: {
  actorUserId?: string;
  resourceType?: string;
  resourceId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  const query: any = {};

  if (filters.actorUserId) {
    query.actorUserId = filters.actorUserId;
  }
  if (filters.resourceType) {
    query.resourceType = filters.resourceType;
  }
  if (filters.resourceId) {
    query.resourceId = filters.resourceId;
  }
  if (filters.action) {
    query.action = filters.action;
  }
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) {
      query.createdAt.$gte = filters.startDate;
    }
    if (filters.endDate) {
      query.createdAt.$lte = filters.endDate;
    }
  }

  const limit = filters.limit || 100;

  return AuditLog.find(query)
    .populate('actorUserId', 'name email')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}
