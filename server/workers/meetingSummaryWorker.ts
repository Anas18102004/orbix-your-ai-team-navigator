/**
 * Meeting Summary Worker
 * 
 * Calls LangGraph to generate meeting summaries and action items.
 */
import { Meeting } from '../models/Meeting';
import { AIContextDoc } from '../models/AIContextDoc';
import { Workspace } from '../models/Workspace';
import { Task } from '../models/Task';
import { createAuditLog } from '../services/auditService';
import { MeetingMetrics } from '../services/meetings/metrics';
import axios from 'axios';

export interface SummaryJobData {
  meetingId: string;
  transcriptId: string;
}

export interface ActionItem {
  title: string;
  description: string;
  suggestedAssigneeIds: string[];
  suggestedDue: string | null;
  confidence: number;
  transcriptExcerpt: string;
}

export interface SummaryResult {
  summary: string;
  actionItems: ActionItem[];
  explainability: Array<{ actionItemIndex: number; transcriptExcerpts: string[] }>;
}

/**
 * Process summary job
 */
export async function processSummaryJob(data: SummaryJobData): Promise<void> {
  const { meetingId, transcriptId } = data;

  try {
    const meeting = await Meeting.findById(meetingId).populate('workspaceId');
    if (!meeting) {
      throw new Error(`Meeting ${meetingId} not found`);
    }

    const transcriptDoc = await AIContextDoc.findById(transcriptId);
    if (!transcriptDoc) {
      throw new Error(`Transcript ${transcriptId} not found`);
    }

    const workspace = meeting.workspaceId as any;

    // Metrics
    MeetingMetrics.langgraphJobStarted(meeting.workspaceId.toString());

    // Call LangGraph endpoint
    const summaryResult = await callLangGraphSummary({
      transcript: transcriptDoc.text,
      meetingMetadata: {
        title: meeting.title,
        agenda: meeting.agenda,
        participants: meeting.participants.length,
        duration: meeting.startTime && meeting.endTime
          ? (meeting.endTime.getTime() - meeting.startTime.getTime()) / 1000
          : null,
      },
      workspaceContext: {
        name: workspace.name,
        description: workspace.description,
      },
    });

    // Create summary doc
    const summaryDoc = new AIContextDoc({
      workspaceId: meeting.workspaceId,
      type: 'meeting_summary',
      sourceId: meetingId as any,
      text: summaryResult.summary,
      metadata: {
        actionItems: summaryResult.actionItems,
        explainability: summaryResult.explainability,
        transcriptId: transcriptId,
      },
    });

    await summaryDoc.save();

    // Update meeting
    meeting.aiSummaryId = summaryDoc._id;
    await meeting.save();

    // Create draft tasks if automation mode allows
    const aiSettings = workspace.aiSettings || {};
    if (aiSettings.automationMode === 'semi_auto' || aiSettings.automationMode === 'full_auto') {
      await createDraftTasks(meeting, summaryResult.actionItems, aiSettings.automationMode);
    }

    // Audit log
    await createAuditLog({
      actorUserId: meeting.organizerId.toString(),
      action: 'summary_generated',
      resourceType: 'meeting',
      resourceId: meetingId,
      detail: {
        summaryId: summaryDoc._id.toString(),
        actionItemCount: summaryResult.actionItems.length,
      },
    });

    // Emit WebSocket event
    // TODO: Emit via socket.io
    console.log(`Summary ready for meeting ${meetingId}`);
  } catch (error: any) {
    console.error(`Summary job failed for meeting ${meetingId}:`, error);
    
    // Metrics
    const meeting = await Meeting.findById(meetingId);
    if (meeting) {
      MeetingMetrics.langgraphJobFailed(meeting.workspaceId.toString());
    }
    
    throw error;
  }
}

/**
 * Call LangGraph meeting_summary_graph
 */
async function callLangGraphSummary(data: {
  transcript: string;
  meetingMetadata: any;
  workspaceContext: any;
}): Promise<SummaryResult> {
  const endpoint = process.env.LANGGRAPH_ENDPOINT || 'https://internal-langgraph/execute';
  const apiKey = process.env.LANGGRAPH_API_KEY;

  if (!apiKey) {
    // Fallback: return placeholder summary
    console.warn('LANGGRAPH_API_KEY not set, returning placeholder summary');
    return {
      summary: `Meeting: ${data.meetingMetadata.title}\n\nKey discussion points and decisions from the meeting.`,
      actionItems: [],
      explainability: [],
    };
  }

  try {
    const response = await axios.post(
      `${endpoint}/meeting_summary_graph`,
      {
        transcript: data.transcript,
        meeting_metadata: data.meetingMetadata,
        workspace_context: data.workspaceContext,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 second timeout
      }
    );

    return response.data as SummaryResult;
  } catch (error: any) {
    console.error('LangGraph API error:', error.message);
    // Return fallback summary
    return {
      summary: `Meeting: ${data.meetingMetadata.title}\n\nSummary generation failed. Please review transcript.`,
      actionItems: [],
      explainability: [],
    };
  }
}

/**
 * Create draft tasks from action items
 */
async function createDraftTasks(
  meeting: any,
  actionItems: ActionItem[],
  automationMode: string
): Promise<void> {
  for (const item of actionItems) {
    const task = new Task({
      workspaceId: meeting.workspaceId,
      title: item.title,
      description: item.description,
      status: 'todo',
      assigneeId: automationMode === 'full_auto' && item.suggestedAssigneeIds.length > 0
        ? item.suggestedAssigneeIds[0]
        : null,
      dueDate: item.suggestedDue ? new Date(item.suggestedDue) : null,
      metadata: {
        source: 'meeting_ai',
        meetingId: meeting._id.toString(),
        confidence: item.confidence,
      },
    });

    await task.save();

    // Audit log
    await createAuditLog({
      actorUserId: meeting.organizerId.toString(),
      action: 'tasks_created_by_ai',
      resourceType: 'meeting',
      resourceId: meeting._id.toString(),
      detail: {
        taskId: task._id.toString(),
        actionItemTitle: item.title,
        automationMode,
      },
    });
  }
}
