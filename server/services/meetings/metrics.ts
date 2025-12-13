/**
 * Meeting Metrics Service
 * 
 * Emits metrics for monitoring and alerting.
 * Assumes: Metrics service (Prometheus, StatsD, etc.) is available.
 */

export interface Metric {
  name: string;
  value: number;
  tags?: Record<string, string>;
}

/**
 * Emit metric (placeholder - integrate with actual metrics service)
 */
export function emitMetric(name: string, value: number = 1, tags?: Record<string, string>): void {
  // TODO: Integrate with Prometheus/StatsD/etc.
  console.log(`[METRIC] ${name}: ${value}`, tags || '');
  
  // Example integration:
  // if (process.env.METRICS_ENABLED === 'true') {
  //   metricsClient.increment(name, value, tags);
  // }
}

/**
 * Meeting metrics
 */
export const MeetingMetrics = {
  created: (workspaceId: string) => emitMetric('meetings.created', 1, { workspaceId }),
  joined: (workspaceId: string) => emitMetric('meetings.joined', 1, { workspaceId }),
  started: (workspaceId: string) => emitMetric('meetings.started', 1, { workspaceId }),
  ended: (workspaceId: string, duration: number) => emitMetric('meetings.ended', 1, { workspaceId, duration: duration.toString() }),
  recordingUploaded: (workspaceId: string, sizeBytes: number) => emitMetric('recordings.uploaded', 1, { workspaceId, size: sizeBytes.toString() }),
  sttJobStarted: (workspaceId: string) => emitMetric('stt.jobs.started', 1, { workspaceId }),
  sttJobFailed: (workspaceId: string) => emitMetric('stt.jobs.failed', 1, { workspaceId }),
  langgraphJobStarted: (workspaceId: string) => emitMetric('langgraph.jobs.started', 1, { workspaceId }),
  langgraphJobFailed: (workspaceId: string) => emitMetric('langgraph.jobs.failed', 1, { workspaceId }),
  recordingDeleted: (workspaceId: string) => emitMetric('recordings.deleted', 1, { workspaceId }),
};
