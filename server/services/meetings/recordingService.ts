/**
 * Recording Service
 * 
 * Handles mediasoup recording integration with ffmpeg.
 * Records audio/video tracks and uploads to S3.
 */
import { getSFUService } from './sfu';
import { uploadRecording } from './s3Service';
import { Recording } from '../../models/Recording';
import { createAuditLog } from '../auditService';
import { MeetingMetrics } from './metrics';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

interface RecordingSession {
  recordingId: string;
  meetingId: string;
  ffmpegProcess: any;
  outputPath: string;
  tracks: Array<{ id: string; kind: string }>;
  startTime: Date;
}

const activeRecordings = new Map<string, RecordingSession>();

/**
 * Start recording a meeting
 */
export async function startMeetingRecording(
  meetingId: string,
  recordingId: string,
  routerId: string,
  tracks: Array<{ id: string; kind: 'audio' | 'video'; rtpParameters: any }>
): Promise<void> {
  const outputDir = path.join(os.tmpdir(), 'orbix-recordings');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `${recordingId}.mp4`);

  // Build ffmpeg command for recording
  // This is a simplified version - in production, you'd configure based on tracks
  const ffmpegArgs = [
    '-f', 'rawvideo',
    '-pixel_format', 'yuv420p',
    '-video_size', '1280x720',
    '-framerate', '30',
    '-i', 'pipe:0',
    '-f', 'pcm_s16le',
    '-ar', '48000',
    '-ac', '2',
    '-i', 'pipe:1',
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    outputPath,
  ];

  const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

  ffmpegProcess.on('error', (error) => {
    console.error('FFmpeg error:', error);
    stopMeetingRecording(recordingId);
  });

  ffmpegProcess.on('exit', async (code) => {
    if (code === 0) {
      // Upload to S3
      await finalizeRecording(recordingId, outputPath);
    } else {
      console.error(`FFmpeg exited with code ${code}`);
      const recording = await Recording.findById(recordingId);
      if (recording) {
        recording.status = 'failed';
        await recording.save();
      }
    }
  });

  activeRecordings.set(recordingId, {
    recordingId,
    meetingId,
    ffmpegProcess,
    outputPath,
    tracks,
    startTime: new Date(),
  });

  console.log(`✅ Recording started for meeting ${meetingId}, recording ${recordingId}`);
}

/**
 * Stop recording and upload to S3
 */
export async function stopMeetingRecording(recordingId: string): Promise<void> {
  const session = activeRecordings.get(recordingId);
  if (!session) {
    throw new Error(`Recording session ${recordingId} not found`);
  }

  // Stop ffmpeg
  session.ffmpegProcess.kill('SIGTERM');

  // Wait for ffmpeg to finish
  await new Promise<void>((resolve) => {
    session.ffmpegProcess.on('exit', () => resolve());
    setTimeout(() => resolve(), 5000); // Timeout after 5s
  });

  activeRecordings.delete(recordingId);

  // Upload will be handled by ffmpeg exit handler
  console.log(`✅ Recording stopped for ${recordingId}`);
}

/**
 * Finalize recording: upload to S3 and update document
 */
async function finalizeRecording(recordingId: string, filePath: string): Promise<void> {
  try {
    const recording = await Recording.findById(recordingId);
    if (!recording) {
      throw new Error(`Recording ${recordingId} not found`);
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    const duration = await getVideoDuration(filePath);

    // Upload to S3
    const uploadResult = await uploadRecording(
      filePath,
      recording.meetingId.toString(),
      recordingId
    );

    // Update recording document
    recording.s3Url = uploadResult.s3Url;
    recording.durationSeconds = duration;
    recording.sizeBytes = uploadResult.sizeBytes;
    recording.format = 'mp4';
    recording.status = 'completed';
    await recording.save();

    // Metrics
    const { Meeting } = await import('../../models/Meeting');
    const meeting = await Meeting.findById(recording.meetingId);
    if (meeting) {
      MeetingMetrics.recordingUploaded(meeting.workspaceId.toString(), uploadResult.sizeBytes);
    }

    // Clean up temp file
    fs.unlinkSync(filePath);

    console.log(`✅ Recording ${recordingId} uploaded to S3: ${uploadResult.s3Url}`);
  } catch (error) {
    console.error(`Failed to finalize recording ${recordingId}:`, error);
    const recording = await Recording.findById(recordingId);
    if (recording) {
      recording.status = 'failed';
      await recording.save();
    }
  }
}

/**
 * Get video duration using ffprobe
 */
async function getVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
    ]);

    let output = '';
    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code === 0) {
        const duration = parseFloat(output.trim());
        resolve(isNaN(duration) ? 0 : duration);
      } else {
        resolve(0); // Default to 0 if can't determine
      }
    });

    ffprobe.on('error', () => resolve(0));
  });
}
