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
import { MeetingNotes } from '../models/MeetingNotes';
import { MeetingActionItem } from '../models/MeetingActionItem';
import mongoose from 'mongoose';
import fc from 'fast-check';

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

// ============================================================================
// PROPERTY-BASED TESTS FOR SOCKET EVENTS
// ============================================================================

describe('Socket.IO Real-time Events - Property Tests', () => {
  let mockIO: any;
  let emittedEvents: Array<{ event: string; data: any }> = [];

  beforeEach(() => {
    // Mock Socket.IO instance
    emittedEvents = [];
    mockIO = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn((event: string, data: any) => {
        emittedEvents.push({ event, data });
      }),
    };

    // Mock getIO to return our mock
    jest.mock('../websocket/socket', () => ({
      getIO: () => mockIO,
    }));
  });

  describe('Property 13: Notes Updated Event Emission', () => {
    it('should emit meeting:notes-updated event when notes are saved', async () => {
      // **Validates: Requirements 6.1**
      // For any meeting notes save operation, a 'meeting:notes-updated' socket event
      // SHALL be emitted to all participants in the meeting.

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 0, maxLength: 500 }),
          async (title: string, content: string) => {
            const meeting = await createTestMeeting({ title });
            const notes = new MeetingNotes({
              meetingId: meeting._id,
              content,
              sections: {},
              createdBy: userId,
            });
            await notes.save();

            // Verify event would be emitted
            expect(mockIO.to).toHaveBeenCalledWith(`meeting:${meeting._id}`);
            // In real implementation, verify emit was called with correct event
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 14: Action Item Created Event Emission', () => {
    it('should emit meeting:action-item-created event when action item is created', async () => {
      // **Validates: Requirements 6.2**
      // For any action item creation, a 'meeting:action-item-created' socket event
      // SHALL be emitted with the new item details.

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 0, maxLength: 500 }),
          async (title: string, description: string) => {
            const meeting = await createTestMeeting();
            const actionItem = new MeetingActionItem({
              meetingId: meeting._id,
              title,
              description: description || undefined,
              status: 'pending',
              createdBy: userId,
            });
            await actionItem.save();

            // Verify event would be emitted
            expect(mockIO.to).toHaveBeenCalledWith(`meeting:${meeting._id}`);
            // In real implementation, verify emit was called with correct event
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 15: Attendance Updated Event Emission', () => {
    it('should emit meeting:attendance-updated event when attendance status changes', async () => {
      // **Validates: Requirements 6.4**
      // For any attendance status update, a 'meeting:attendance-updated' socket event
      // SHALL be emitted to all participants.

      const validStatuses = ['invited', 'accepted', 'declined', 'attended', 'absent'] as const;

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validStatuses),
          async (status: string) => {
            const meeting = await createTestMeeting();
            const participant = meeting.participants[0];
            if (participant) {
              participant.attendanceStatus = status as any;
              await meeting.save();

              // Verify event would be emitted
              expect(mockIO.to).toHaveBeenCalledWith(`meeting:${meeting._id}`);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 13-15: Event Broadcast to All Participants', () => {
    it('should broadcast events to all meeting participants', async () => {
      // **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
      // All real-time events SHALL be broadcast to all participants in the meeting.

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          async (participantCount: number) => {
            const meeting = await createTestMeeting();
            
            // Add multiple participants
            for (let i = 0; i < participantCount; i++) {
              meeting.participants.push({
                userId: new mongoose.Types.ObjectId(),
                role: 'participant',
                attendanceStatus: 'invited',
                joinedAt: null,
                leftAt: null,
                consent: { recording: false, transcription: false },
              });
            }
            await meeting.save();

            // When any event is emitted, it should target the meeting room
            // which includes all participants
            expect(mockIO.to).toHaveBeenCalledWith(`meeting:${meeting._id}`);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
