/**
 * Meeting API Tests
 * 
 * Unit and integration tests for meeting functionality.
 * Run with: npm test -- meetings.test.ts
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import { Meeting } from '../models/Meeting';
import { Recording } from '../models/Recording';
import { WorkspaceMembership } from '../models/WorkspaceMembership';
import mongoose from 'mongoose';

// Mock feature flag
process.env.FEATURE_MEETINGS = 'true';
process.env.MEETINGS_SFU = 'mediasoup';
process.env.JWT_SECRET = 'test-secret';

describe('Meetings API', () => {
  let authToken: string;
  let userId: string;
  let workspaceId: string;

  beforeEach(async () => {
    // Setup test user and workspace
    // This would typically use test fixtures
  });

  afterEach(async () => {
    // Cleanup test data
    await Meeting.deleteMany({});
    await Recording.deleteMany({});
  });

  describe('POST /api/workspaces/:workspaceId/meetings', () => {
    it('should create a meeting with valid data', async () => {
      const response = await request(app)
        .post(`/api/workspaces/${workspaceId}/meetings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Meeting',
          agenda: 'Test agenda',
          startTime: new Date().toISOString(),
          durationMinutes: 30,
          record: false,
        })
        .expect(201);

      expect(response.body).toHaveProperty('meetingId');
      expect(response.body.meeting.title).toBe('Test Meeting');
    });

    it('should require title', async () => {
      await request(app)
        .post(`/api/workspaces/${workspaceId}/meetings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          agenda: 'Test agenda',
        })
        .expect(400);
    });

    it('should require workspace membership', async () => {
      // Test with user not in workspace
      await request(app)
        .post(`/api/workspaces/${workspaceId}/meetings`)
        .set('Authorization', `Bearer ${invalidToken}`)
        .send({ title: 'Test' })
        .expect(403);
    });
  });

  describe('POST /api/meetings/:meetingId/join', () => {
    it('should return SFU join info for mediasoup', async () => {
      const meeting = await createTestMeeting();
      
      const response = await request(app)
        .post(`/api/meetings/${meeting._id}/join`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          consent: { recording: true, transcription: true },
        })
        .expect(200);

      expect(response.body.joinMode).toBe('sfu');
      expect(response.body).toHaveProperty('routerRtpCapabilities');
      expect(response.body).toHaveProperty('createTransportToken');
      expect(response.body).toHaveProperty('turn');
    });

    it('should require consent if recording enabled', async () => {
      const meeting = await createTestMeeting({ record: true });
      
      // Should succeed with consent
      await request(app)
        .post(`/api/meetings/${meeting._id}/join`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          consent: { recording: true, transcription: true },
        })
        .expect(200);
    });
  });

  describe('POST /api/meetings/:meetingId/recording/start', () => {
    it('should only allow organizer to start recording', async () => {
      const meeting = await createTestMeeting({ organizerId: userId });
      
      const response = await request(app)
        .post(`/api/meetings/${meeting._id}/recording/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('recording');
    });

    it('should reject non-organizer', async () => {
      const meeting = await createTestMeeting({ organizerId: otherUserId });
      
      await request(app)
        .post(`/api/meetings/${meeting._id}/recording/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });

    it('should check consent if workspace policy requires it', async () => {
      // Test consent requirement
    });
  });

  describe('Post-meeting pipeline', () => {
    it('should create transcript after meeting ends with recording', async () => {
      // Integration test: meeting → recording → STT → transcript
    });

    it('should generate summary via LangGraph', async () => {
      // Integration test: transcript → LangGraph → summary
    });

    it('should create draft tasks if automationMode=semi_auto', async () => {
      // Test task creation from action items
    });
  });
});

// Helper functions
async function createTestMeeting(overrides: any = {}) {
  return new Meeting({
    workspaceId,
    title: 'Test Meeting',
    organizerId: userId,
    status: 'scheduled',
    ...overrides,
  }).save();
}
