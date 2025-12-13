/**
 * Speech-to-Text Service
 * 
 * Supports multiple STT providers: Whisper, Google Cloud Speech, Azure Speech.
 * For MVP, uses batch processing (post-meeting).
 */
import { AIContextDoc } from '../../models/AIContextDoc';
import { downloadFromS3, extractS3Key } from './s3Service';

export interface TranscriptResult {
  text: string;
  timestamps?: Array<{ start: number; end: number; text: string }>;
  confidence?: number;
}

/**
 * Transcribe audio/video file from S3
 */
export async function transcribeFromS3(
  s3Url: string,
  meetingId: string,
  workspaceId: string
): Promise<TranscriptResult> {
  const provider = process.env.STT_PROVIDER || 'whisper';

  // Download file locally (temporary)
  const tempPath = await downloadFromS3(s3Url);

  try {
    let result: TranscriptResult;

    switch (provider) {
      case 'whisper':
        result = await transcribeWithWhisper(tempPath);
        break;
      case 'google':
        result = await transcribeWithGoogle(tempPath);
        break;
      case 'azure':
        result = await transcribeWithAzure(tempPath);
        break;
      default:
        throw new Error(`Unknown STT provider: ${provider}`);
    }

    // Create aiContextDoc for transcript
    const transcriptDoc = new AIContextDoc({
      workspaceId,
      type: 'meeting_transcript',
      sourceId: meetingId as any,
      text: result.text,
      metadata: {
        provider,
        timestamps: result.timestamps,
        confidence: result.confidence,
        s3Url,
      },
    });

    await transcriptDoc.save();

    return result;
  } finally {
    // Clean up temp file
    const fs = await import('fs');
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
}

/**
 * Whisper transcription (OpenAI API or local)
 */
async function transcribeWithWhisper(filePath: string): Promise<TranscriptResult> {
  const apiKey = process.env.STT_API_KEY || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('STT_API_KEY or OPENAI_API_KEY required for Whisper');
  }

  // Use OpenAI Whisper API
  const FormData = (await import('form-data')).default;
  const fs = await import('fs');
  const axios = (await import('axios')).default;

  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');

  const response = await axios.post(
    'https://api.openai.com/v1/audio/transcriptions',
    formData,
    {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  return {
    text: response.data.text,
    timestamps: response.data.segments?.map((s: any) => ({
      start: s.start,
      end: s.end,
      text: s.text,
    })),
  };
}

/**
 * Google Cloud Speech-to-Text
 */
async function transcribeWithGoogle(filePath: string): Promise<TranscriptResult> {
  // TODO: Implement Google Cloud Speech-to-Text
  throw new Error('Google STT not yet implemented');
}

/**
 * Azure Speech Services
 */
async function transcribeWithAzure(filePath: string): Promise<TranscriptResult> {
  // TODO: Implement Azure Speech Services
  throw new Error('Azure STT not yet implemented');
}

/**
 * Download file from S3 to temporary location
 */
async function downloadFromS3(s3Url: string): Promise<string> {
  const fs = await import('fs');
  const path = await import('path');
  const os = await import('os');
  const { downloadFromS3: downloadS3 } = await import('./s3Service');

  const key = extractS3Key(s3Url);
  const tempPath = path.join(os.tmpdir(), `recording-${Date.now()}.mp4`);

  await downloadS3(key, tempPath);
  return tempPath;
}
