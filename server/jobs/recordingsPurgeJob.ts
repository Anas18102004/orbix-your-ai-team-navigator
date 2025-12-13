/**
 * Recordings Purge Job
 * 
 * Runs daily to delete recordings and transcripts older than retention period.
 * Respects workspace-level retention settings.
 */
import { Recording } from '../models/Recording';
import { Meeting } from '../models/Meeting';
import { AIContextDoc } from '../models/AIContextDoc';
import { Workspace } from '../models/Workspace';
import { deleteRecording, extractS3Key } from '../services/meetings/s3Service';

// Export deleteMeetingRecordings for use in admin API
export { deleteMeetingRecordings };
import { createAuditLog } from '../services/auditService';
import { MeetingMetrics } from '../services/meetings/metrics';

const DEFAULT_RETENTION_DAYS = parseInt(process.env.DEFAULT_MEETING_RETENTION_DAYS || '365');

/**
 * Run purge job
 */
export async function runRecordingsPurgeJob(): Promise<void> {
  console.log('🧹 Starting recordings purge job...');

  try {
    // Get all workspaces to check retention settings
    const workspaces = await Workspace.find({}).lean();
    const workspaceRetentionMap = new Map<string, number>();

    for (const workspace of workspaces) {
      const retentionDays = (workspace as any).retentionDays || DEFAULT_RETENTION_DAYS;
      workspaceRetentionMap.set(workspace._id.toString(), retentionDays);
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DEFAULT_RETENTION_DAYS);

    // Find old meetings
    const oldMeetings = await Meeting.find({
      status: 'ended',
      endTime: { $lt: cutoffDate },
    }).lean();

    let deletedCount = 0;
    let errorCount = 0;

    for (const meeting of oldMeetings) {
      try {
        const workspaceRetention = workspaceRetentionMap.get(meeting.workspaceId.toString()) || DEFAULT_RETENTION_DAYS;
        const meetingCutoff = new Date();
        meetingCutoff.setDate(meetingCutoff.getDate() - workspaceRetention);

        if (meeting.endTime && meeting.endTime < meetingCutoff) {
          await deleteMeetingRecordings(meeting);
          deletedCount++;
        }
      } catch (error: any) {
        console.error(`Failed to delete recordings for meeting ${meeting._id}:`, error);
        errorCount++;
      }
    }

    console.log(`✅ Purge job completed: ${deletedCount} meetings processed, ${errorCount} errors`);
  } catch (error: any) {
    console.error('❌ Purge job failed:', error);
    throw error;
  }
}

/**
 * Delete all recordings and transcripts for a meeting
 */
async function deleteMeetingRecordings(meeting: any): Promise<void> {
  // Delete recordings from S3 and DB
  const recordings = await Recording.find({ meetingId: meeting._id });
  
  for (const recording of recordings) {
    try {
      // Delete from S3
      if (recording.s3Url) {
        const s3Key = extractS3Key(recording.s3Url);
        await deleteRecording(s3Key);
      }

      // Delete recording document
      await Recording.deleteOne({ _id: recording._id });

      // Audit log
      await createAuditLog({
        actorUserId: meeting.organizerId.toString(),
        action: 'recording_deleted',
        resourceType: 'meeting',
        resourceId: meeting._id.toString(),
        detail: { recordingId: recording._id.toString(), reason: 'retention_policy' },
      });

      // Metrics
      MeetingMetrics.recordingDeleted(meeting.workspaceId.toString());
    } catch (error: any) {
      console.error(`Failed to delete recording ${recording._id}:`, error);
    }
  }

  // Delete transcript and summary docs
  if (meeting.transcriptId) {
    await AIContextDoc.deleteOne({ _id: meeting.transcriptId });
  }
  if (meeting.aiSummaryId) {
    await AIContextDoc.deleteOne({ _id: meeting.aiSummaryId });
  }
}

/**
 * Schedule purge job (call from cron or scheduler)
 */
export function schedulePurgeJob(): void {
  // Run daily at 2 AM
  const cron = require('node-cron');
  cron.schedule('0 2 * * *', async () => {
    await runRecordingsPurgeJob();
  });
  console.log('✅ Recordings purge job scheduled (daily at 2 AM)');
}
