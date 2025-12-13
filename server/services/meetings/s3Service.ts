/**
 * S3 Service for Meeting Recordings
 * 
 * Handles uploading recordings to S3 and generating signed URLs for playback.
 * Assumes: AWS SDK v3 is available or we use a compatible library.
 */
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';

const s3Client = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || '',
    secretAccessKey: process.env.S3_SECRET_KEY || '',
  },
});

const BUCKET_NAME = process.env.RECORDING_S3_BUCKET || 'orbix-meetings';

export interface UploadResult {
  s3Url: string;
  key: string;
  sizeBytes: number;
}

/**
 * Upload recording file to S3
 */
export async function uploadRecording(
  filePath: string,
  meetingId: string,
  recordingId: string
): Promise<UploadResult> {
  const fileStats = fs.statSync(filePath);
  const fileExtension = path.extname(filePath);
  const key = `meetings/${meetingId}/${recordingId}${fileExtension}`;

  const fileContent = fs.readFileSync(filePath);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileContent,
    ContentType: fileExtension === '.mp4' ? 'video/mp4' : 'video/webm',
  });

  await s3Client.send(command);

  const s3Url = `s3://${BUCKET_NAME}/${key}`;

  return {
    s3Url,
    key,
    sizeBytes: fileStats.size,
  };
}

/**
 * Generate signed URL for playback (default 1 hour expiry)
 */
export async function getSignedPlaybackUrl(
  s3Key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });
  return url;
}

/**
 * Delete recording from S3
 */
export async function deleteRecording(s3Key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  await s3Client.send(command);
}

/**
 * Extract S3 key from s3Url
 */
export function extractS3Key(s3Url: string): string {
  // s3://bucket-name/path/to/file -> path/to/file
  const match = s3Url.match(/s3:\/\/[^\/]+\/(.+)/);
  return match ? match[1] : s3Url;
}

/**
 * Download file from S3 (for STT processing)
 */
export async function downloadFromS3(s3Key: string, outputPath: string): Promise<void> {
  const { GetObjectCommand } = await import('@aws-sdk/client-s3');
  const fs = await import('fs');
  
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  const response = await s3Client.send(command);
  const fileStream = fs.createWriteStream(outputPath);
  
  if (response.Body) {
    // @ts-ignore
    response.Body.pipe(fileStream);
  }

  return new Promise((resolve, reject) => {
    fileStream.on('finish', resolve);
    fileStream.on('error', reject);
  });
}
