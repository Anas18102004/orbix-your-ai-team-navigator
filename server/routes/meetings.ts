/**
 * Meeting API Routes
 * 
 * All routes are guarded by FEATURE_MEETINGS feature flag.
 * Assumes: Workspace membership middleware is applied.
 * 
 * VIDEO_PROVIDER_HOOK: External video providers (Zoom, Google Meet) are supported
 * but the system works fully without any provider configured.
 */
import express, { Response } from 'express';
import { Meeting, MeetingType, MeetingStatus, ParticipantRole, AttendanceStatus, MeetingProvider } from '../models/Meeting';
import { MeetingActionItem } from '../models/MeetingActionItem';
import { MeetingNotes } from '../models/MeetingNotes';
import { Recording } from '../models/Recording';
import { Workspace } from '../models/Workspace';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireWorkspaceMember, requireOmniOrOrgAdmin } from '../middleware/workspaceAuth';
import { requireMeetingsFeature } from '../middleware/featureFlags';
import { createAuditLog } from '../services/auditService';
import { OrgAdmin } from '../models/OrgAdmin';
import { getSFUService } from '../services/meetings/sfu';
import { MeetingMetrics } from '../services/meetings/metrics';
import mongoose from 'mongoose';

// VIDEO_PROVIDER_HOOK: Import provider system
import { getMeetingProvider, getProvidersStatus, getConfiguredProviders } from '../modules/meetings/providers';
import { getIO } from '../websocket/socket';

const router = express.Router();

// All routes require authentication and meetings feature flag
router.use(authenticate);
router.use(requireMeetingsFeature);

// Create meeting
router.post('/:workspaceId/meetings', requireWorkspaceMember, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.userId!;
    const {
      title,
      description,
      agenda,
      meetingType = 'custom',
      startTime,
      endTime,
      timezone = 'UTC',
      recurrenceRule,
      participants = [],
      participantIds = [],  // Legacy support
      record = false,
      meetingProvider = null  // VIDEO_PROVIDER_HOOK: 'zoom' | 'google_meet' | 'internal' | null
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Meeting title is required' });
    }

    // Validate meeting type
    const validTypes: MeetingType[] = ['standup', 'planning', 'review', 'retrospective', '1:1', 'custom'];
    if (meetingType && !validTypes.includes(meetingType)) {
      return res.status(400).json({ error: 'Invalid meeting type' });
    }

    // Build participants array with roles
    // Support both new format (with roles) and legacy format (just IDs)
    const participantsList = participants.length > 0
      ? participants.map((p: { userId: string; role?: ParticipantRole }) => ({
        userId: p.userId,
        role: p.role || 'participant',
        attendanceStatus: 'invited' as AttendanceStatus,
        joinedAt: null,
        leftAt: null,
        consent: { recording: false, transcription: false },
      }))
      : participantIds.map((pid: string) => ({
        userId: pid,
        role: 'participant' as ParticipantRole,
        attendanceStatus: 'invited' as AttendanceStatus,
        joinedAt: null,
        leftAt: null,
        consent: { recording: false, transcription: false },
      }));

    // VIDEO_PROVIDER_HOOK: Create external meeting if provider specified
    console.log('[meetings] Creating meeting with provider:', {
      requestedProvider: meetingProvider,
      availableProviders: getConfiguredProviders().map(p => p.name),
    });

    let providerResult = null;
    if (meetingProvider && meetingProvider !== 'internal') {
      const provider = getMeetingProvider(meetingProvider);
      console.log('[meetings] Provider lookup result:', {
        providerName: meetingProvider,
        found: !!provider,
        isConfigured: provider?.isConfigured(),
      });

      if (provider && provider.isConfigured()) {
        try {
          // Get organizer email for provider
          const { User } = await import('../models/User');
          const organizer = await User.findById(userId).select('email').lean();

          console.log('[meetings] Calling provider.createMeeting...');
          providerResult = await provider.createMeeting({
            title,
            description: description || undefined,
            agenda: agenda || undefined,
            startTime: startTime ? new Date(startTime) : undefined,
            endTime: endTime ? new Date(endTime) : undefined,
            timezone,
            organizerEmail: organizer?.email || '',
          });
          console.log('[meetings] Provider result:', providerResult);
        } catch (providerError: any) {
          console.error(`[meetings] ${meetingProvider} provider error:`, providerError.message);
          console.error(`[meetings] Full error:`, providerError);
          // Continue without provider - meeting still works internally
        }
      } else {
        console.log('[meetings] Provider not configured, skipping external meeting creation');
      }
    } else {
      console.log('[meetings] No external provider requested or internal only');
    }

    // Create meeting with extended fields
    const meeting = new Meeting({
      workspaceId,
      title,
      description: description || null,
      agenda: agenda || null,
      meetingType,
      organizerId: userId,
      status: 'scheduled',
      startTime: startTime ? new Date(startTime) : null,
      endTime: endTime ? new Date(endTime) : null,
      timezone,
      recurrenceRule: recurrenceRule || null,
      participants: participantsList,
      recordingIds: [],
      // AI fields initialized as null (AI_HOOK: populated later)
      aiAgenda: null,
      aiSummary: null,
      aiDecisions: null,
      aiRisks: null,
      aiMetadata: null,
      // VIDEO_PROVIDER_HOOK: Store provider URLs if created
      meetingProvider: providerResult?.provider || (meetingProvider === 'internal' ? 'internal' : null),
      meetingJoinUrl: providerResult?.joinUrl || null,
      meetingHostUrl: providerResult?.hostUrl || null,
      meetingExternalId: providerResult?.externalId || null,
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
        description: meeting.description,
        agenda: meeting.agenda,
        meetingType: meeting.meetingType,
        organizerId: meeting.organizerId,
        status: meeting.status,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        timezone: meeting.timezone,
        recurrenceRule: meeting.recurrenceRule,
        participants: meeting.participants,
        // VIDEO_PROVIDER_HOOK: Include provider URLs
        meetingProvider: meeting.meetingProvider,
        meetingJoinUrl: meeting.meetingJoinUrl,
        meetingHostUrl: meeting.meetingHostUrl,
        createdAt: meeting.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Create meeting error:', error);
    res.status(500).json({ error: error.message || 'Failed to create meeting' });
  }
});

// VIDEO_PROVIDER_HOOK: Get available video providers status
// Route: GET /api/meetings/providers/status
router.get('/meetings/providers/status', async (req: AuthRequest, res: Response) => {
  try {
    const status = getProvidersStatus();
    const configured = getConfiguredProviders();

    console.log('[meetings] Provider status check:', {
      allProviders: status,
      configured: configured.map(p => p.name),
    });

    res.json({
      providers: status,
      hasExternalProvider: configured.some(p => p.name !== 'internal'),
      configuredProviders: configured.map(p => p.name),
    });
  } catch (error: any) {
    console.error('Get providers status error:', error);
    res.status(500).json({ error: error.message || 'Failed to get providers status' });
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
      description: m.description,
      agenda: m.agenda,
      meetingType: m.meetingType,
      organizer: (m as any).organizerId,
      status: m.status,
      startTime: m.startTime,
      endTime: m.endTime,
      timezone: m.timezone,
      recurrenceRule: m.recurrenceRule,
      participants: m.participants,
      recordingIds: m.recordingIds,
      // VIDEO_PROVIDER_HOOK: Include provider info
      meetingProvider: m.meetingProvider,
      meetingJoinUrl: m.meetingJoinUrl,
      // AI fields
      aiAgenda: m.aiAgenda,
      aiSummary: m.aiSummary,
      aiSummaryId: m.aiSummary ? true : undefined,
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
      description: meeting.description,
      agenda: meeting.agenda,
      meetingType: meeting.meetingType,
      organizer: (meeting as any).organizerId,
      status: meeting.status,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      timezone: meeting.timezone,
      participants: meeting.participants.map((p: any) => ({
        userId: p.userId,
        user: (p.userId as any).name ? { name: (p.userId as any).name, email: (p.userId as any).email } : null,
        role: p.role,
        joinedAt: p.joinedAt,
        leftAt: p.leftAt,
        consent: p.consent,
      })),
      recordingIds: meeting.recordingIds,
      // VIDEO_PROVIDER_HOOK: Include provider URLs
      meetingProvider: meeting.meetingProvider,
      meetingJoinUrl: meeting.meetingJoinUrl,
      meetingHostUrl: meeting.meetingHostUrl,
      meetingExternalId: meeting.meetingExternalId,
      // AI fields
      aiAgenda: meeting.aiAgenda,
      aiSummary: meeting.aiSummary,
      createdAt: meeting.createdAt,
    });
  } catch (error: any) {
    console.error('Get meeting error:', error);
    res.status(500).json({ error: error.message || 'Failed to get meeting' });
  }
});

// Join meeting - Returns discriminated response based on meetingProvider
// VIDEO_PROVIDER_HOOK: External providers (Zoom, Google Meet) return providerJoinUrl
// Internal meetings return SFU info. Never both simultaneously.
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
        role: 'participant' as ParticipantRole,
        attendanceStatus: 'attended' as AttendanceStatus,
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

    // Audit log
    await createAuditLog({
      actorUserId: userId.toString(),
      action: 'meeting_joined',
      resourceType: 'meeting',
      resourceId: meeting._id.toString(),
      detail: { consent, provider: meeting.meetingProvider },
    });

    // Metrics
    MeetingMetrics.joined(meeting.workspaceId.toString());

    // DISCRIMINATED RESPONSE: Return different response based on meetingProvider
    // Property 1: Join Flow Exclusivity - Never return both SFU info AND providerJoinUrl
    // Property 2: Provider-Specific Join Response - Internal/null never have providerJoinUrl
    // Property 3: External Provider Join Response - External providers always have providerJoinUrl

    if (meeting.meetingProvider === 'zoom' || meeting.meetingProvider === 'google_meet') {
      // EXTERNAL PROVIDER: Return providerJoinUrl only
      // Frontend will redirect to this URL instead of opening internal room
      if (!meeting.meetingJoinUrl) {
        return res.status(400).json({ 
          error: `${meeting.meetingProvider} meeting URL not available. Meeting may not have been created successfully.` 
        });
      }

      res.json({
        joinMode: 'external',
        meetingProvider: meeting.meetingProvider,
        providerJoinUrl: meeting.meetingJoinUrl,
        providerHostUrl: meeting.meetingHostUrl || undefined,
        meeting: {
          meetingId: meeting._id.toString(),
          status: meeting.status,
          title: meeting.title,
          provider: meeting.meetingProvider,
        },
      });
    } else {
      // INTERNAL MEETING: Return SFU info only (meetingProvider is null or 'internal')
      // Frontend will proceed with internal mediasoup room
      const sfuService = await getSFUService();
      const routerId = await sfuService.getOrCreateRouter(meeting._id.toString());
      const routerRtpCapabilities = (sfuService as any).getRouterRtpCapabilities(routerId);
      const joinToken = sfuService.generateJoinToken(meetingId, userId.toString());
      const turn = sfuService.getTURNCredentials();

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
    }
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

// ============================================================================
// MEETING UPDATE & LIFECYCLE ENDPOINTS (NEW)
// ============================================================================

// Update meeting (organizer/Omni/OrgAdmin only)
router.put('/meetings/:meetingId', async (req: AuthRequest, res: Response) => {
  try {
    const { meetingId } = req.params;
    const userId = req.userId!;

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Verify permission
    const isOrganizer = meeting.organizerId.toString() === userId.toString();
    let canEdit = isOrganizer;

    if (!canEdit) {
      const { WorkspaceMembership } = await import('../models/WorkspaceMembership');
      const membership = await WorkspaceMembership.findOne({
        workspaceId: meeting.workspaceId,
        userId,
        status: 'active',
      });
      if (membership?.role === 'omni') canEdit = true;

      if (!canEdit) {
        const orgAdmin = await OrgAdmin.findOne({ userId });
        if (orgAdmin) {
          const workspace = await Workspace.findById(meeting.workspaceId);
          if (workspace?.orgId?.toString() === orgAdmin.organizationId.toString()) {
            canEdit = true;
          }
        }
      }
    }

    if (!canEdit) {
      return res.status(403).json({ error: 'Insufficient permissions to edit meeting' });
    }

    // Allowed update fields
    const {
      title,
      description,
      agenda,
      meetingType,
      startTime,
      endTime,
      timezone,
      recurrenceRule,
      participants,
    } = req.body;

    // Update fields if provided
    if (title !== undefined) meeting.title = title;
    if (description !== undefined) meeting.description = description;
    if (agenda !== undefined) meeting.agenda = agenda;
    if (meetingType !== undefined) meeting.meetingType = meetingType;
    if (startTime !== undefined) meeting.startTime = startTime ? new Date(startTime) : null;
    if (endTime !== undefined) meeting.endTime = endTime ? new Date(endTime) : null;
    if (timezone !== undefined) meeting.timezone = timezone;
    if (recurrenceRule !== undefined) meeting.recurrenceRule = recurrenceRule;
    if (participants !== undefined) {
      meeting.participants = participants.map((p: any) => ({
        userId: p.userId,
        role: p.role || 'participant',
        attendanceStatus: p.attendanceStatus || 'invited',
        joinedAt: p.joinedAt || null,
        leftAt: p.leftAt || null,
        consent: p.consent || { recording: false, transcription: false },
      }));
    }

    await meeting.save();

    // Audit log
    await createAuditLog({
      actorUserId: userId.toString(),
      action: 'meeting_updated',
      resourceType: 'meeting',
      resourceId: meetingId,
      detail: { fields: Object.keys(req.body) },
    });

    res.json({ meeting });
  } catch (error: any) {
    console.error('Update meeting error:', error);
    res.status(500).json({ error: error.message || 'Failed to update meeting' });
  }
});

// Cancel meeting (separate from delete - sets status)
router.post('/meetings/:meetingId/cancel', async (req: AuthRequest, res: Response) => {
  try {
    const { meetingId } = req.params;
    const userId = req.userId!;
    const { reason } = req.body;

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Only organizer or admins can cancel
    const isOrganizer = meeting.organizerId.toString() === userId.toString();
    let canCancel = isOrganizer;

    if (!canCancel) {
      const { WorkspaceMembership } = await import('../models/WorkspaceMembership');
      const membership = await WorkspaceMembership.findOne({
        workspaceId: meeting.workspaceId,
        userId,
        status: 'active',
      });
      if (membership?.role === 'omni') canCancel = true;
    }

    if (!canCancel) {
      return res.status(403).json({ error: 'Only meeting organizer can cancel' });
    }

    if (meeting.status === 'ended' || meeting.status === 'cancelled') {
      return res.status(400).json({ error: 'Meeting is already ended or cancelled' });
    }

    meeting.status = 'cancelled';
    await meeting.save();

    // Notify participants
    const { Notification } = await import('../models/Notification');
    const notifications = meeting.participants.map((p) => ({
      userId: p.userId,
      workspaceId: meeting.workspaceId,
      type: 'SYSTEM' as const,
      entityId: meeting._id,
      message: `Meeting cancelled: ${meeting.title}${reason ? ` - ${reason}` : ''}`,
      read: false,
      createdAt: new Date(),
    }));
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    // Audit log
    await createAuditLog({
      actorUserId: userId.toString(),
      action: 'meeting_cancelled',
      resourceType: 'meeting',
      resourceId: meetingId,
      detail: { reason },
    });

    res.json({ meeting, message: 'Meeting cancelled successfully' });
  } catch (error: any) {
    console.error('Cancel meeting error:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel meeting' });
  }
});

// Complete meeting (explicit completion)
router.post('/meetings/:meetingId/complete', async (req: AuthRequest, res: Response) => {
  try {
    const { meetingId } = req.params;
    const userId = req.userId!;

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const isOrganizer = meeting.organizerId.toString() === userId.toString();
    if (!isOrganizer) {
      const { WorkspaceMembership } = await import('../models/WorkspaceMembership');
      const membership = await WorkspaceMembership.findOne({
        workspaceId: meeting.workspaceId,
        userId,
        status: 'active',
      });
      if (!membership || membership.role !== 'omni') {
        return res.status(403).json({ error: 'Only organizer or Omni can complete meetings' });
      }
    }

    // Update all participants who joined to 'attended'
    meeting.participants.forEach((p) => {
      if (p.joinedAt) {
        p.attendanceStatus = 'attended';
        if (!p.leftAt) p.leftAt = new Date();
      } else if (p.attendanceStatus === 'invited' || p.attendanceStatus === 'accepted') {
        p.attendanceStatus = 'absent';
      }
    });

    meeting.status = 'ended';
    meeting.endTime = new Date();
    await meeting.save();

    // Audit log
    await createAuditLog({
      actorUserId: userId.toString(),
      action: 'meeting_completed',
      resourceType: 'meeting',
      resourceId: meetingId,
      detail: { participantCount: meeting.participants.length },
    });

    res.json({ meeting, message: 'Meeting completed successfully' });
  } catch (error: any) {
    console.error('Complete meeting error:', error);
    res.status(500).json({ error: error.message || 'Failed to complete meeting' });
  }
});

// ============================================================================
// ATTENDANCE MANAGEMENT (NEW)
// ============================================================================

// Update participant attendance status
router.put('/meetings/:meetingId/attendance', async (req: AuthRequest, res: Response) => {
  try {
    const { meetingId } = req.params;
    const userId = req.userId!;
    const { participantId, attendanceStatus } = req.body;

    if (!participantId || !attendanceStatus) {
      return res.status(400).json({ error: 'participantId and attendanceStatus are required' });
    }

    const validStatuses: AttendanceStatus[] = ['invited', 'accepted', 'declined', 'attended', 'absent'];
    if (!validStatuses.includes(attendanceStatus)) {
      return res.status(400).json({ error: 'Invalid attendance status' });
    }

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Only organizer, Omni, or the participant themselves can update
    const isOrganizer = meeting.organizerId.toString() === userId.toString();
    const isSelf = participantId === userId.toString();
    let canUpdate = isOrganizer || isSelf;

    if (!canUpdate) {
      const { WorkspaceMembership } = await import('../models/WorkspaceMembership');
      const membership = await WorkspaceMembership.findOne({
        workspaceId: meeting.workspaceId,
        userId,
        status: 'active',
      });
      if (membership?.role === 'omni') canUpdate = true;
    }

    if (!canUpdate) {
      return res.status(403).json({ error: 'Insufficient permissions to update attendance' });
    }

    const participant = meeting.participants.find(
      (p) => p.userId.toString() === participantId
    );

    if (!participant) {
      return res.status(404).json({ error: 'Participant not found in meeting' });
    }

    participant.attendanceStatus = attendanceStatus;
    await meeting.save();

    // Emit real-time event to all meeting participants
    // Property 15: Attendance Updated Event Emission
    const io = getIO();
    if (io) {
      io.to(`meeting:${meetingId}`).emit('meeting:attendance-updated', {
        meetingId,
        participant: {
          userId: participantId,
          attendanceStatus: attendanceStatus,
          updatedAt: new Date(),
        },
        updatedBy: userId,
      });
    }

    res.json({ participant, message: 'Attendance updated successfully' });
  } catch (error: any) {
    console.error('Update attendance error:', error);
    res.status(500).json({ error: error.message || 'Failed to update attendance' });
  }
});

// ============================================================================
// NOTES ENDPOINTS (NEW)
// ============================================================================

// Get meeting notes
router.get('/meetings/:meetingId/notes', async (req: AuthRequest, res: Response) => {
  try {
    const { meetingId } = req.params;
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

    const notes = await MeetingNotes.findOne({ meetingId })
      .populate('createdBy', 'name email')
      .populate('lastEditedBy', 'name email')
      .lean();

    res.json({ notes: notes || null });
  } catch (error: any) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: error.message || 'Failed to get notes' });
  }
});

// Create or update meeting notes
router.post('/meetings/:meetingId/notes', async (req: AuthRequest, res: Response) => {
  try {
    const { meetingId } = req.params;
    const userId = req.userId!;
    const { content, sections } = req.body;

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

    // Find existing or create new
    let notes = await MeetingNotes.findOne({ meetingId });

    if (notes) {
      // Update existing
      if (content !== undefined) notes.content = content;
      if (sections) {
        if (sections.discussion !== undefined) notes.sections.discussion = sections.discussion;
        if (sections.decisions !== undefined) notes.sections.decisions = sections.decisions;
        if (sections.risks !== undefined) notes.sections.risks = sections.risks;
        if (sections.followups !== undefined) notes.sections.followups = sections.followups;
      }
      notes.lastEditedBy = new mongoose.Types.ObjectId(userId);
      await notes.save();
    } else {
      // Create new
      notes = new MeetingNotes({
        meetingId,
        content: content || '',
        sections: {
          discussion: sections?.discussion || null,
          decisions: sections?.decisions || null,
          risks: sections?.risks || null,
          followups: sections?.followups || null,
        },
        createdBy: userId,
        lastEditedBy: userId,
      });
      await notes.save();
    }

    // Audit log
    await createAuditLog({
      actorUserId: userId.toString(),
      action: 'meeting_notes_updated',
      resourceType: 'meeting',
      resourceId: meetingId,
      detail: { notesId: notes._id.toString() },
    });

    // Emit real-time event to all meeting participants
    // Property 13: Notes Updated Event Emission
    const io = getIO();
    if (io) {
      io.to(`meeting:${meetingId}`).emit('meeting:notes-updated', {
        meetingId,
        notes: {
          _id: notes._id,
          content: notes.content,
          sections: notes.sections,
          updatedAt: notes.updatedAt,
          lastEditedBy: notes.lastEditedBy,
        },
        updatedBy: userId,
      });
    }

    res.json({ notes });
  } catch (error: any) {
    console.error('Save notes error:', error);
    res.status(500).json({ error: error.message || 'Failed to save notes' });
  }
});

// ============================================================================
// ACTION ITEMS ENDPOINTS (NEW)
// ============================================================================

// Get action items for a meeting
router.get('/meetings/:meetingId/action-items', async (req: AuthRequest, res: Response) => {
  try {
    const { meetingId } = req.params;
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

    const actionItems = await MeetingActionItem.find({ meetingId })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('linkedTaskId', 'title status')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ actionItems });
  } catch (error: any) {
    console.error('Get action items error:', error);
    res.status(500).json({ error: error.message || 'Failed to get action items' });
  }
});

// Create action item
router.post('/meetings/:meetingId/action-items', async (req: AuthRequest, res: Response) => {
  try {
    const { meetingId } = req.params;
    const userId = req.userId!;
    const { title, description, assignedTo, dueDate, status = 'pending' } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ error: 'Action item title is required' });
    }

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

    const actionItem = new MeetingActionItem({
      meetingId,
      title: title.trim(),
      description: description?.trim() || null,
      assignedTo: assignedTo || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      status,
      linkedTaskId: null,
      createdBy: userId,
    });

    await actionItem.save();

    // Audit log
    await createAuditLog({
      actorUserId: userId.toString(),
      action: 'action_item_created',
      resourceType: 'meeting',
      resourceId: meetingId,
      detail: { actionItemId: actionItem._id.toString(), title },
    });

    // Populate for response
    await actionItem.populate('assignedTo', 'name email');
    await actionItem.populate('createdBy', 'name email');

    // Emit real-time event to all meeting participants
    // Property 14: Action Item Created Event Emission
    const io = getIO();
    if (io) {
      io.to(`meeting:${meetingId}`).emit('meeting:action-item-created', {
        meetingId,
        actionItem: {
          _id: actionItem._id,
          title: actionItem.title,
          description: actionItem.description,
          assignedTo: actionItem.assignedTo,
          dueDate: actionItem.dueDate,
          status: actionItem.status,
          createdBy: actionItem.createdBy,
          createdAt: actionItem.createdAt,
        },
      });
    }

    res.status(201).json({ actionItem });
  } catch (error: any) {
    console.error('Create action item error:', error);
    res.status(500).json({ error: error.message || 'Failed to create action item' });
  }
});

// Update action item
router.put('/meetings/:meetingId/action-items/:actionItemId', async (req: AuthRequest, res: Response) => {
  try {
    const { meetingId, actionItemId } = req.params;
    const userId = req.userId!;
    const { title, description, assignedTo, dueDate, status } = req.body;

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

    const actionItem = await MeetingActionItem.findOne({
      _id: actionItemId,
      meetingId,
    });

    if (!actionItem) {
      return res.status(404).json({ error: 'Action item not found' });
    }

    // Update fields
    if (title !== undefined) actionItem.title = title.trim();
    if (description !== undefined) actionItem.description = description?.trim() || null;
    if (assignedTo !== undefined) actionItem.assignedTo = assignedTo || null;
    if (dueDate !== undefined) actionItem.dueDate = dueDate ? new Date(dueDate) : null;
    if (status !== undefined) actionItem.status = status;

    await actionItem.save();

    // Populate for response
    await actionItem.populate('assignedTo', 'name email');
    await actionItem.populate('createdBy', 'name email');

    // Emit real-time event to all meeting participants
    // Property 14: Action Item Updated Event Emission (part of Property 14)
    const io = getIO();
    if (io) {
      io.to(`meeting:${meetingId}`).emit('meeting:action-item-updated', {
        meetingId,
        actionItem: {
          _id: actionItem._id,
          title: actionItem.title,
          description: actionItem.description,
          assignedTo: actionItem.assignedTo,
          dueDate: actionItem.dueDate,
          status: actionItem.status,
          createdBy: actionItem.createdBy,
          updatedAt: actionItem.updatedAt,
        },
      });
    }

    res.json({ actionItem });
  } catch (error: any) {
    console.error('Update action item error:', error);
    res.status(500).json({ error: error.message || 'Failed to update action item' });
  }
});

// Delete action item
router.delete('/meetings/:meetingId/action-items/:actionItemId', async (req: AuthRequest, res: Response) => {
  try {
    const { meetingId, actionItemId } = req.params;
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

    const actionItem = await MeetingActionItem.findOneAndDelete({
      _id: actionItemId,
      meetingId,
    });

    if (!actionItem) {
      return res.status(404).json({ error: 'Action item not found' });
    }

    // Audit log
    await createAuditLog({
      actorUserId: userId.toString(),
      action: 'action_item_deleted',
      resourceType: 'meeting',
      resourceId: meetingId,
      detail: { actionItemId, title: actionItem.title },
    });

    res.json({ success: true, message: 'Action item deleted' });
  } catch (error: any) {
    console.error('Delete action item error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete action item' });
  }
});

// Link action item to existing task
router.post('/meetings/:meetingId/action-items/:actionItemId/link', async (req: AuthRequest, res: Response) => {
  try {
    const { meetingId, actionItemId } = req.params;
    const userId = req.userId!;
    const { taskId } = req.body;

    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

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

    // Verify task exists in same workspace
    const { Task } = await import('../models/Task');
    const task = await Task.findOne({
      _id: taskId,
      workspaceId: meeting.workspaceId,
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found or not in same workspace' });
    }

    const actionItem = await MeetingActionItem.findOneAndUpdate(
      { _id: actionItemId, meetingId },
      { linkedTaskId: taskId },
      { new: true }
    )
      .populate('assignedTo', 'name email')
      .populate('linkedTaskId', 'title status');

    if (!actionItem) {
      return res.status(404).json({ error: 'Action item not found' });
    }

    res.json({ actionItem, message: 'Action item linked to task' });
  } catch (error: any) {
    console.error('Link action item error:', error);
    res.status(500).json({ error: error.message || 'Failed to link action item' });
  }
});

export default router;
