/**
 * STT Worker
 * 
 * Processes recordings and generates transcripts.
 * Should be run as a background job (Bull, RabbitMQ, etc.).
 */
import { Recording } from '../models/Recording';
import { Meeting } from '../models/Meeting';
import { transcribeFromS3 } from '../services/meetings/sttService';
import { AIContextDoc } from '../models/AIContextDoc';
import { createAuditLog } from '../services/auditService';
import { MeetingMetrics } from '../services/meetings/metrics';

export interface STTJobData {
  recordingId: string;
  meetingId: string;
}

/**
 * Process STT job
 */
export async function processSTTJob(data: STTJobData): Promise<void> {
  const { recordingId, meetingId } = data;

  try {
    const recording = await Recording.findById(recordingId);
    if (!recording) {
      throw new Error(`Recording ${recordingId} not found`);
    }

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      throw new Error(`Meeting ${meetingId} not found`);
    }

    // Update recording status
    recording.status = 'processing';
    await recording.save();

    // Metrics
    MeetingMetrics.sttJobStarted(meeting.workspaceId.toString());

    // Transcribe
    const transcriptResult = await transcribeFromS3(
      recording.s3Url,
      meetingId,
      meeting.workspaceId.toString()
    );

    // Find the transcript doc that was created
    const transcriptDoc = await AIContextDoc.findOne({
      workspaceId: meeting.workspaceId,
      type: 'meeting_transcript',
      sourceId: meetingId as any,
    }).sort({ createdAt: -1 });

    if (transcriptDoc) {
      // Update meeting with transcript ID
      meeting.transcriptId = transcriptDoc._id;
      await meeting.save();

      // Audit log
      await createAuditLog({
        actorUserId: recording.createdByUserId.toString(),
        action: 'transcript_created',
        resourceType: 'meeting',
        resourceId: meetingId,
        detail: { transcriptId: transcriptDoc._id.toString(), recordingId },
      });

      // Enqueue LangGraph summary job
      await enqueueSummaryJob(meetingId, transcriptDoc._id.toString());
    }

    // Update recording status
    recording.status = 'completed';
    await recording.save();
  } catch (error: any) {
    console.error(`STT job failed for recording ${recordingId}:`, error);
    
    // Update recording status to failed
    const recording = await Recording.findById(recordingId);
    if (recording) {
      recording.status = 'failed';
      await recording.save();
      
      // Metrics
      const meeting = await Meeting.findById(meetingId);
      if (meeting) {
        MeetingMetrics.sttJobFailed(meeting.workspaceId.toString());
      }
    }

    throw error;
  }
}

/**
 * Enqueue LangGraph summary job
 */
async function enqueueSummaryJob(meetingId: string, transcriptId: string): Promise<void> {
  // TODO: Use actual job queue (Bull, RabbitMQ, etc.)
  // For now, process immediately
  const { processSummaryJob } = await import('./meetingSummaryWorker');
  await processSummaryJob({ meetingId, transcriptId });
}

/**
 * Enqueue STT job (for use by API routes)
 */
export async function enqueueSTTJob(recordingId: string, meetingId: string): Promise<void> {
  // TODO: Use actual job queue
  // For MVP, process immediately
  await processSTTJob({ recordingId, meetingId });
}
