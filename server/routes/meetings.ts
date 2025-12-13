/**
 * Meeting API Routes
 * 
 * All routes are guarded by FEATURE_MEETINGS feature flag.
 * Assumes: Workspace membership middleware is applied.
 */
import express, { Response } from 'express';
import { Meeting } from '../models/Meeting';
import { Recording } from '../models/Recording';
import { Workspace } from '../models/Workspace';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireWorkspaceMember, requireOmniOrOrgAdmin } from '../middleware/workspaceAuth';
import { requireMeetingsFeature } from '../middleware/featureFlags';
import { createAuditLog } from '../services/auditService';
import { OrgAdmin } from '../models/OrgAdmin';
import { getSFUService } from '../services/meetings/sfu';
import { MeetingMetrics } from '../services/meetings/metrics';

const router = express.Router();

// All routes require authentication and meetings feature flag
router.use(authenticate);
router.use(requireMeetingsFeature);

// Create meeting
router.post('/:workspaceId/meetings', requireWorkspaceMember, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.userId!;
    const { title, agenda, startTime, durationMinutes, participantIds = [], record = false } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Meeting title is required' });
    }

    // Create meeting
    const meeting = new Meeting({
      workspaceId,
      title,
      agenda: agenda || null,
      organizerId: userId,
      status: 'scheduled',
      startTime: startTime ? new Date(startTime) : null,
      participants: participantIds.map((pid: string) => ({
        userId: pid,
        joinedAt: null,
        leftAt: null,
        consent: { recording: false, transcription: false },
      })),
      recordingIds: [],
    });

    await meeting.save();

    // Audit log
    await createAuditLog({
      actorUserId: userId.toString(),
      action: 'meeting_created',
      resourceType: 'meeting',
      resourceId: meeting._id.toString(),
      detail: { title, record, participantCount: participantIds.length },
    });

    // Notify all workspace members
    const { WorkspaceMembership } = await import('../models/WorkspaceMembership');
    const { Notification } = await import('../models/Notification');

    // Get all active members except the creator
    const members = await WorkspaceMembership.find({
      workspaceId,
      status: 'active',
      userId: { $ne: userId }
    });

    if (members.length > 0) {
      const notifications = members.map(member => ({
        userId: member.userId,
        workspaceId,
        type: 'INVITE', // Using INVITE or we could add MEETING_CREATED to enum if possible
        entityId: meeting._id,
        message: `New meeting scheduled: ${title}`,
        read: false,
        createdAt: new Date()
      }));

      await Notification.insertMany(notifications);
    }

    // Metrics
    MeetingMetrics.created(workspaceId);

    res.status(201).json({
      meetingId: meeting._id,
      meeting: {
        _id: meeting._id,
        workspaceId: meeting.workspaceId,
        title: meeting.title,
        agenda: meeting.agenda,
        organizerId: meeting.organizerId,
        status: meeting.status,
        startTime: meeting.startTime,
        participants: meeting.participants,
        createdAt: meeting.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Create meeting error:', error);
    res.status(500).json({ error: error.message || 'Failed to create meeting' });
  }
});

// List meetings for workspace
router.get('/:workspaceId/meetings', requireWorkspaceMember, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { status } = req.query;

    const query: any = { workspaceId };
    if (status === 'upcoming') {
      // Show all scheduled and in-progress meetings, regardless of start time
      // This ensures recently started meetings or "just scheduled" meetings appear
      query.status = { $in: ['scheduled', 'in_progress', 'upcoming'] };
      // query.startTime = { $gte: new Date() }; // Removed strict time filter
    } else if (status === 'past') {
      query.status = 'ended';
    }

    const meetings = await Meeting.find(query)
      .populate('organizerId', 'name email')
      .sort({ startTime: -1 })
      .lean();

    res.json(meetings.map(m => ({
      _id: m._id,
      workspaceId: m.workspaceId,
      title: m.title,
      agenda: m.agenda,
      organizer: (m as any).organizerId,
      status: m.status,
      startTime: m.startTime,
      endTime: m.endTime,
      participants: m.participants,
      createdAt: m.createdAt,
    })));
  } catch (error: any) {
    console.error('List meetings error:', error);
    res.status(500).json({ error: error.message || 'Failed to list meetings' });
  }
});

// Get meeting details
router.get('/meetings/:meetingId', async (req: AuthRequest, res: Response) => {
  try {
    const { meetingId } = req.params;
    const userId = req.userId!;

    const meeting = await Meeting.findById(meetingId)
      .populate('organizerId', 'name email')
      .populate('participants.userId', 'name email')
      .lean();

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Check if user is workspace member
    const { WorkspaceMembership } = await import('../models/WorkspaceMembership');
    const membership = await WorkspaceMembership.findOne({
      workspaceId: meeting.workspaceId,
      userId,
      status: 'active',
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this workspace' });
    }

    res.json({
      _id: meeting._id,
      workspaceId: meeting.workspaceId,
      title: meeting.title,
      agenda: meeting.agenda,
      organizer: (meeting as any).organizerId,
      status: meeting.status,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      participants: meeting.participants.map((p: any) => ({
        userId: p.userId,
        user: (p.userId as any).name ? { name: (p.userId as any).name, email: (p.userId as any).email } : null,
        joinedAt: p.joinedAt,
        leftAt: p.leftAt,
        consent: p.consent,
      })),
      recordingIds: meeting.recordingIds,
      createdAt: meeting.createdAt,
    });
  } catch (error: any) {
    console.error('Get meeting error:', error);
    res.status(500).json({ error: error.message || 'Failed to get meeting' });
  }
});

// Join meeting
router.post('/meetings/:meetingId/join', async (req: AuthRequest, res: Response) => {
  try {
    const { meetingId } = req.params;
    const userId = req.userId!;
    const { consent } = req.body;

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Verify workspace membership
    const { WorkspaceMembership } = await import('../models/WorkspaceMembership');
    const membership = await WorkspaceMembership.findOne({
      workspaceId: meeting.workspaceId,
      userId,
      status: 'active',
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this workspace' });
    }

    // Find or add participant
    let participant = meeting.participants.find(
      (p) => p.userId.toString() === userId.toString()
    );

    if (!participant) {
      participant = {
        userId: userId as any,
        joinedAt: null,
        leftAt: null,
        consent: { recording: false, transcription: false },
      };
      meeting.participants.push(participant);
    }

    // Update participant
    participant.joinedAt = new Date();
    participant.consent = {
      recording: consent?.recording || false,
      transcription: consent?.transcription || false,
    };

    await meeting.save();

    // Get SFU service and generate join response
    const sfuService = await getSFUService();
    const routerId = await sfuService.getOrCreateRouter(meeting._id.toString());
    const routerRtpCapabilities = (sfuService as any).getRouterRtpCapabilities(routerId);
    const joinToken = sfuService.generateJoinToken(meetingId, userId.toString());
    const turn = sfuService.getTURNCredentials();

    // Audit log
    await createAuditLog({
      actorUserId: userId.toString(),
      action: 'meeting_joined',
      resourceType: 'meeting',
      resourceId: meeting._id.toString(),
      detail: { consent },
    });

    // Metrics
    MeetingMetrics.joined(meeting.workspaceId.toString());

    res.json({
      joinMode: 'sfu',
      routerRtpCapabilities,
      createTransportToken: joinToken,
      turn,
      meeting: {
        meetingId: meeting._id.toString(),
        status: meeting.status,
        participants: meeting.participants.map((p) => ({
          userId: p.userId.toString(),
          joinedAt: p.joinedAt,
          consent: p.consent,
        })),
      },
    });
  } catch (error: any) {
    console.error('Join meeting error:', error);
    res.status(500).json({ error: error.message || 'Failed to join meeting' });
  }
});

// Leave meeting
router.post('/meetings/:meetingId/leave', async (req: AuthRequest, res: Response) => {
  try {
    const { meetingId } = req.params;
    const userId = req.userId!;

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const participant = meeting.participants.find(
      (p) => p.userId.toString() === userId.toString()
    );

    if (participant) {
      participant.leftAt = new Date();
      await meeting.save();

      // Audit log
      await createAuditLog({
        actorUserId: userId.toString(),
        action: 'meeting_left',
        resourceType: 'meeting',
        resourceId: meeting._id.toString(),
        detail: {},
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Leave meeting error:', error);
    res.status(500).json({ error: error.message || 'Failed to leave meeting' });
  }
});

// Start meeting (organizer/Omni only)
router.post('/meetings/:meetingId/start', async (req: AuthRequest, res: Response) => {
  try {
    const { meetingId } = req.params;
    const userId = req.userId!;

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Verify user is organizer or Omni
    const isOrganizer = meeting.organizerId.toString() === userId.toString();
    let isOrgAdmin = false;

    if (!isOrganizer) {
      // Check if Org Admin
      const orgAdmin = await OrgAdmin.findOne({ userId });
      if (orgAdmin) {
        const workspace = await Workspace.findById(meeting.workspaceId);
        if (workspace?.orgId?.toString() === orgAdmin.organizationId.toString()) {
          isOrgAdmin = true;
        }
      }
    }

    if (!isOrganizer && !isOrgAdmin) {
      const { WorkspaceMembership } = await import('../models/WorkspaceMembership');
      const membership = await WorkspaceMembership.findOne({
        workspaceId: meeting.workspaceId,
        userId,
        status: 'active',
      });
      if (!membership || membership.role !== 'omni') {
        return res.status(403).json({ error: 'Only organizer or Omni can start meetings' });
      }
    }

    meeting.status = 'in_progress';
    meeting.startTime = new Date();
    await meeting.save();

    // Audit log
    await createAuditLog({
      actorUserId: userId.toString(),
      action: 'meeting_started',
      resourceType: 'meeting',
      resourceId: meeting._id.toString(),
      detail: {},
    });

    // Metrics
    MeetingMetrics.started(meeting.workspaceId.toString());

    res.json({
      meeting: {
        _id: meeting._id,
        status: meeting.status,
        startTime: meeting.startTime,
      },
    });
  } catch (error: any) {
    console.error('Start meeting error:', error);
    res.status(500).json({ error: error.message || 'Failed to start meeting' });
  }
});

// End meeting (organizer/Omni only)
router.post('/meetings/:meetingId/end', async (req: AuthRequest, res: Response) => {
  try {
    const { meetingId } = req.params;
    const userId = req.userId!;

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Verify user is organizer or Omni (same check as start)
    const isOrganizer = meeting.organizerId.toString() === userId.toString();
    let isOrgAdmin = false;

    if (!isOrganizer) {
      // Check if Org Admin
      const orgAdmin = await OrgAdmin.findOne({ userId });
      if (orgAdmin) {
        const workspace = await Workspace.findById(meeting.workspaceId);
        if (workspace?.orgId?.toString() === orgAdmin.organizationId.toString()) {
          isOrgAdmin = true;
        }
      }
    }

    if (!isOrganizer && !isOrgAdmin) {
      const { WorkspaceMembership } = await import('../models/WorkspaceMembership');
      const membership = await WorkspaceMembership.findOne({
        workspaceId: meeting.workspaceId,
        userId,
        status: 'active',
      });
      if (!membership || membership.role !== 'omni') {
        return res.status(403).json({ error: 'Only organizer or Omni can end meetings' });
      }
    }

    meeting.status = 'ended';
    meeting.endTime = new Date();
    await meeting.save();

    // Trigger post-meeting pipeline if recording exists
    if (meeting.recordingIds.length > 0) {
      const { enqueueSTTJob } = await import('../workers/sttWorker');
      await enqueueSTTJob(meeting.recordingIds[0].toString(), meetingId);
    }

    const duration = meeting.endTime && meeting.startTime
      ? (meeting.endTime.getTime() - meeting.startTime.getTime()) / 1000
      : 0;

    // Audit log
    await createAuditLog({
      actorUserId: userId.toString(),
      action: 'meeting_ended',
      resourceType: 'meeting',
      resourceId: meeting._id.toString(),
      detail: { duration },
    });

    // Metrics
    MeetingMetrics.ended(meeting.workspaceId.toString(), duration);

    res.json({
      meeting: {
        _id: meeting._id,
        status: meeting.status,
        endTime: meeting.endTime,
      },
    });
  } catch (error: any) {
    console.error('End meeting error:', error);
    res.status(500).json({ error: error.message || 'Failed to end meeting' });
  }
});

// Start recording (host only)
router.post('/meetings/:meetingId/recording/start', async (req: AuthRequest, res: Response) => {
  try {
    const { meetingId } = req.params;
    const userId = req.userId!;

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Verify user is organizer
    if (meeting.organizerId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only meeting organizer can start recording' });
    }

    // Check consent if workspace policy requires it
    const workspace = await Workspace.findById(meeting.workspaceId);
    const policy = (workspace as any).policy || {};
    if (policy.recordingRequiresAll) {
      const allConsented = meeting.participants.every(p => p.consent.recording);
      if (!allConsented) {
        return res.status(403).json({ error: 'All participants must consent to recording' });
      }
    }

    // Create recording document
    const recording = new Recording({
      meetingId: meeting._id,
      s3Url: '', // Will be set after upload
      durationSeconds: 0,
      format: 'mp4',
      sizeBytes: 0,
      createdByUserId: userId,
      status: 'pending',
    });

    await recording.save();

    meeting.recordingIds.push(recording._id);
    await meeting.save();

    // Start actual recording via mediasoup
    const { startMeetingRecording } = await import('../services/meetings/recordingService');
    const sfuService = await getSFUService();
    const routerId = await sfuService.getOrCreateRouter(meeting._id.toString());

    // Note: In production, tracks would come from active producers in the meeting
    // For MVP, we'll start recording and tracks will be added as participants join
    await startMeetingRecording(
      meetingId,
      recording._id.toString(),
      routerId,
      [] // Tracks will be added dynamically
    );

    // Audit log
    await createAuditLog({
      actorUserId: userId.toString(),
      action: 'recording_started',
      resourceType: 'meeting',
      resourceId: meeting._id.toString(),
      detail: { recordingId: recording._id.toString(), consentSnapshot: meeting.participants.map(p => ({ userId: p.userId.toString(), consented: p.consent.recording })) },
    });

    // Metrics
    MeetingMetrics.recordingUploaded(meeting.workspaceId.toString(), 0); // Size will be updated later

    res.json({
      recording: {
        _id: recording._id,
        status: recording.status,
      },
    });
  } catch (error: any) {
    console.error('Start recording error:', error);
    res.status(500).json({ error: error.message || 'Failed to start recording' });
  }
});

// Stop recording (host only)
router.post('/meetings/:meetingId/recording/stop', async (req: AuthRequest, res: Response) => {
  try {
    const { meetingId } = req.params;
    const userId = req.userId!;

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Verify user is organizer
    if (meeting.organizerId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only meeting organizer can stop recording' });
    }

    // Get latest recording
    const recording = await Recording.findOne({
      meetingId: meeting._id,
      status: { $in: ['pending', 'processing'] },
    }).sort({ createdAt: -1 });

    if (!recording) {
      return res.status(404).json({ error: 'No active recording found' });
    }

    // Stop recording and upload to S3
    const { stopMeetingRecording } = await import('../services/meetings/recordingService');
    await stopMeetingRecording(recording._id.toString());

    // For now, mark as completed (will be updated by worker)
    recording.status = 'processing';
    await recording.save();

    // Audit log
    await createAuditLog({
      actorUserId: userId.toString(),
      action: 'recording_stopped',
      resourceType: 'meeting',
      resourceId: meeting._id.toString(),
      detail: { recordingId: recording._id.toString() },
    });

    res.json({
      recording: {
        _id: recording._id,
        status: recording.status,
      },
    });
  } catch (error: any) {
    console.error('Stop recording error:', error);
    res.status(500).json({ error: error.message || 'Failed to stop recording' });
  }
});

// Delete meeting recordings (Org Admin only)
router.delete('/meetings/:meetingId/recordings', async (req: AuthRequest, res: Response) => {
  try {
    const { meetingId } = req.params;
    const userId = req.userId!;

    // Verify Org Admin
    const { OrgAdmin } = await import('../models/OrgAdmin');
    const orgAdmin = await OrgAdmin.findOne({ userId });
    if (!orgAdmin) {
      return res.status(403).json({ error: 'Org Admin access required' });
    }

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Delete recordings
    const { deleteMeetingRecordings } = await import('../jobs/recordingsPurgeJob');
    await deleteMeetingRecordings(meeting as any);

    // Audit log
    await createAuditLog({
      actorUserId: userId.toString(),
      action: 'recording_deleted',
      resourceType: 'meeting',
      resourceId: meetingId,
      detail: { reason: 'admin_request' },
    });

    res.json({ success: true, message: 'Recordings deleted' });
  } catch (error: any) {
    console.error('Delete recordings error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete recordings' });
  }
});

// Get recording playback URL
router.get('/meetings/:meetingId/recordings/:recordingId/playback', async (req: AuthRequest, res: Response) => {
  try {
    const { meetingId, recordingId } = req.params;
    const userId = req.userId!;

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Verify workspace membership
    const { WorkspaceMembership } = await import('../models/WorkspaceMembership');
    const membership = await WorkspaceMembership.findOne({
      workspaceId: meeting.workspaceId,
      userId,
      status: 'active',
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this workspace' });
    }

    const recording = await Recording.findById(recordingId);
    if (!recording || recording.meetingId.toString() !== meetingId) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    // Check download permissions
    const workspace = await Workspace.findById(meeting.workspaceId);
    const policy = (workspace as any).policy || {};

    // Check if user is Org Admin
    const isOrgAdmin = !!(await OrgAdmin.exists({ userId }));

    const canDownload = membership.role === 'omni' ||
      isOrgAdmin ||
      policy.recordingDownloadAllowed;

    if (!canDownload) {
      return res.status(403).json({ error: 'Download not allowed for your role' });
    }

    // Generate signed URL
    const { getSignedPlaybackUrl, extractS3Key } = await import('../services/meetings/s3Service');
    const s3Key = extractS3Key(recording.s3Url);
    const signedUrl = await getSignedPlaybackUrl(s3Key, 3600); // 1 hour expiry

    res.json({
      playbackUrl: signedUrl,
      expiresIn: 3600,
      recording: {
        _id: recording._id,
        durationSeconds: recording.durationSeconds,
        format: recording.format,
        createdAt: recording.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Get playback URL error:', error);
    res.status(500).json({ error: error.message || 'Failed to get playback URL' });
  }
});

// Delete meeting (organizer/Omni/Org Admin only)
router.delete('/meetings/:meetingId', async (req: AuthRequest, res: Response) => {
  try {
    const { meetingId } = req.params;
    const userId = req.userId!;

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Verify user is organizer or Omni/Org Admin
    const isOrganizer = meeting.organizerId.toString() === userId.toString();
    let isGenericAdmin = false;

    if (!isOrganizer) {
      // Check for Omni role in workspace
      const { WorkspaceMembership } = await import('../models/WorkspaceMembership');
      const membership = await WorkspaceMembership.findOne({
        workspaceId: meeting.workspaceId,
        userId,
        status: 'active',
      });
      if (membership && membership.role === 'omni') {
        isGenericAdmin = true;
      }

      // Check for Org Admin if not Omni
      if (!isGenericAdmin) {
        const orgAdmin = await OrgAdmin.findOne({ userId });
        if (orgAdmin) {
          const workspace = await Workspace.findById(meeting.workspaceId);
          if (workspace?.orgId?.toString() === orgAdmin.organizationId.toString()) {
            isGenericAdmin = true;
          }
        }
      }
    }

    if (!isOrganizer && !isGenericAdmin) {
      return res.status(403).json({ error: 'Insufficient permissions to delete meeting' });
    }

    // If meeting has recordings, clean them up
    if (meeting.recordingIds.length > 0) {
      const { deleteMeetingRecordings } = await import('../jobs/recordingsPurgeJob');
      await deleteMeetingRecordings(meeting as any);
    }

    await meeting.deleteOne();

    // Audit log
    await createAuditLog({
      actorUserId: userId.toString(),
      action: 'meeting_deleted',
      resourceType: 'meeting',
      resourceId: meetingId,
      detail: { reason: 'user_action' },
    });

    // Metrics - we might want to track deletions

    res.json({ success: true, message: 'Meeting deleted' });
  } catch (error: any) {
    console.error('Delete meeting error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete meeting' });
  }
});

export default router;
