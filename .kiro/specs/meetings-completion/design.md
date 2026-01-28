# Design Document: Meetings Feature Completion

## Overview

This design addresses the critical join flow bug and completes the Meetings feature with frontend pages, API methods, validation, and real-time updates. The system maintains clean separation between internal (mediasoup) and external (Zoom/Google Meet) video providers, ensuring the system works perfectly without external providers.

**Key Design Principles:**
- External providers are optional - system works fully with internal meetings only
- Type-safe throughout with discriminated unions for provider types
- Clean separation: UI components use apiClient, no business logic in components
- Real-time updates via Socket.IO for collaborative features
- Validation at both frontend and backend

## Architecture

### Join Flow Fix

**Current Bug:** Both internal and external meetings open simultaneously

**Fixed Flow:**
```
User clicks "Join Meeting"
  ↓
Frontend calls apiClient.joinMeeting(meetingId, consent)
  ↓
Backend checks meeting.meetingProvider
  ├─ If null or 'internal': Return SFU info (routerRtpCapabilities, joinToken, TURN)
  │  Frontend: Navigate to /meeting/:meetingId (internal room)
  │
  └─ If 'zoom' or 'google_meet': Return providerJoinUrl
     Frontend: window.open(providerJoinUrl) and navigate away
```

**Key Changes:**
1. Backend join endpoint returns discriminated response based on provider
2. Frontend checks response type and routes accordingly
3. Never both internal and external simultaneously

### Frontend Architecture

**New Components:**
- `MeetingDetailPage.tsx` - Dedicated meeting detail view
- `MeetingNotesEditor.tsx` - Rich text notes editor
- `ActionItemsPanel.tsx` - Action items list and creation
- `AttendancePanel.tsx` - Attendance tracking UI

**Enhanced Components:**
- `ScheduleMeetingModal.tsx` - Add provider, roles, recurrence, timezone, consent selectors
- `MeetingRoom.tsx` - Update join flow to handle external providers

**State Management:**
- Use TanStack Query for meeting data fetching and caching
- Use Zustand for meeting UI state (sidebar visibility, layout, etc.)
- Socket.IO listeners for real-time updates

### Backend Architecture

**New Routes:**
- `PUT /api/meetings/:meetingId` - Update meeting
- `POST /api/meetings/:meetingId/cancel` - Cancel meeting
- `POST /api/meetings/:meetingId/complete` - Complete meeting
- `PUT /api/meetings/:meetingId/attendance` - Update attendance
- `GET /api/meetings/:meetingId/notes` - Get notes
- `POST /api/meetings/:meetingId/notes` - Save notes
- `GET /api/meetings/:meetingId/action-items` - List action items
- `POST /api/meetings/:meetingId/action-items` - Create action item
- `PUT /api/meetings/:meetingId/action-items/:itemId` - Update action item
- `DELETE /api/meetings/:meetingId/action-items/:itemId` - Delete action item
- `POST /api/meetings/:meetingId/action-items/:itemId/link` - Link to task

**Service Layer:**
- `MeetingService` - Business logic for meeting operations
- `MeetingNotesService` - Notes persistence and validation
- `ActionItemService` - Action item CRUD and linking
- Validation functions for all inputs

**Socket.IO Events:**
- `meeting:notes-updated` - Emitted when notes are saved
- `meeting:action-item-created` - Emitted when action item created
- `meeting:action-item-updated` - Emitted when action item updated
- `meeting:attendance-updated` - Emitted when attendance changes

### Data Models

**Meeting (Extended):**
```typescript
interface Meeting {
  _id: ObjectId;
  workspaceId: ObjectId;
  title: string;
  description?: string;
  agenda?: string;
  meetingType: 'standup' | 'planning' | 'review' | 'retrospective' | '1:1' | 'custom';
  organizerId: ObjectId;
  status: 'scheduled' | 'in_progress' | 'ended' | 'cancelled';
  startTime?: Date;
  endTime?: Date;
  timezone: string;
  recurrenceRule?: string;
  participants: ParticipantInfo[];
  recordingIds: ObjectId[];
  
  // VIDEO_PROVIDER_HOOK
  meetingProvider: 'internal' | 'zoom' | 'google_meet' | null;
  meetingJoinUrl?: string;
  meetingHostUrl?: string;
  meetingExternalId?: string;
  
  // AI fields
  aiAgenda?: string;
  aiSummary?: string;
  aiDecisions?: string[];
  aiRisks?: string[];
  aiSummaryId?: ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

interface ParticipantInfo {
  userId: ObjectId;
  role: 'organizer' | 'host' | 'participant' | 'observer';
  attendanceStatus: 'invited' | 'accepted' | 'declined' | 'attended' | 'absent';
  joinedAt?: Date;
  leftAt?: Date;
  consent: { recording: boolean; transcription: boolean };
}
```

**MeetingNotes (New):**
```typescript
interface MeetingNotes {
  _id: ObjectId;
  meetingId: ObjectId;
  workspaceId: ObjectId;
  content: string; // Rich text (max 50KB)
  sections?: {
    discussion?: string;
    decisions?: string;
    risks?: string;
    followups?: string;
  };
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

**ActionItem (New):**
```typescript
interface ActionItem {
  _id: ObjectId;
  meetingId: ObjectId;
  workspaceId: ObjectId;
  title: string;
  description?: string;
  assignedTo?: ObjectId;
  dueDate?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  linkedTaskId?: ObjectId; // Link to workspace task
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

## Components and Interfaces

### Frontend API Client Methods

```typescript
// Meeting Management
updateMeeting(meetingId: string, data: UpdateMeetingInput): Promise<Meeting>
cancelMeeting(meetingId: string, reason?: string): Promise<Meeting>
completeMeeting(meetingId: string): Promise<Meeting>
updateAttendance(meetingId: string, participantId: string, status: AttendanceStatus): Promise<Participant>

// Meeting Notes
getMeetingNotes(meetingId: string): Promise<MeetingNotes | null>
saveMeetingNotes(meetingId: string, data: SaveNotesInput): Promise<MeetingNotes>

// Action Items
getMeetingActionItems(meetingId: string): Promise<ActionItem[]>
createActionItem(meetingId: string, data: CreateActionItemInput): Promise<ActionItem>
updateActionItem(meetingId: string, itemId: string, data: UpdateActionItemInput): Promise<ActionItem>
deleteActionItem(meetingId: string, itemId: string): Promise<void>
linkActionItemToTask(meetingId: string, itemId: string, taskId: string): Promise<ActionItem>
```

### Frontend Components

**MeetingDetailPage:**
- Displays meeting info, notes, action items, attendance
- Editable notes section with rich text editor
- Action items list with create/edit/delete
- Attendance tracking
- AI summary display (if available)

**MeetingNotesEditor:**
- Rich text editor (using Slate or similar)
- Auto-save with debounce
- Sections: Discussion, Decisions, Risks, Followups
- Character count and validation

**ActionItemsPanel:**
- List of action items with status badges
- Create new action item form
- Edit/delete inline
- Link to task modal
- Assignee and due date pickers

**AttendancePanel:**
- List of participants with status
- Status badges (invited, accepted, declined, attended, absent)
- Join time display

### Backend Validation

**Meeting Creation:**
- Title: required, non-empty, max 200 chars
- StartTime: if provided, must be in future
- EndTime: if provided, must be after startTime
- Participants: valid user IDs, valid roles

**Meeting Update:**
- Same validations as creation
- Cannot update ended/cancelled meetings

**Meeting Notes:**
- Content: max 50KB
- Sections: optional, each max 10KB

**Action Items:**
- Title: required, non-empty, max 200 chars
- Status: must be one of allowed values
- DueDate: if provided, should be reasonable (not too far in future)
- AssignedTo: if provided, must be valid user ID

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Join Flow Exclusivity
*For any* meeting with a provider type (internal, zoom, google_meet, or null), when a user joins, the backend response SHALL contain either SFU info OR providerJoinUrl, but never both.
**Validates: Requirements 1.1, 1.2, 1.3, 1.5**

### Property 2: Provider-Specific Join Response
*For any* meeting with meetingProvider='internal' or null, the join response SHALL NOT include a providerJoinUrl field.
**Validates: Requirements 1.5**

### Property 3: External Provider Join Response
*For any* meeting with meetingProvider='zoom' or 'google_meet', the join response SHALL include a providerJoinUrl field.
**Validates: Requirements 1.2, 1.4**

### Property 4: Meeting Detail Page Completeness
*For any* meeting, when displayed on the detail page, all required fields (title, agenda, organizer, participants, status) SHALL be rendered.
**Validates: Requirements 2.1**

### Property 5: Notes Persistence Round Trip
*For any* meeting notes content, when saved via saveMeetingNotes() and then retrieved via getMeetingNotes(), the retrieved content SHALL match the saved content.
**Validates: Requirements 2.3, 4.6**

### Property 6: Action Item Creation and Retrieval
*For any* action item created via createActionItem(), when retrieved via getMeetingActionItems(), the item SHALL appear in the list with all provided fields intact.
**Validates: Requirements 2.5, 4.8**

### Property 7: Action Item to Task Linking
*For any* action item linked to a task via linkActionItemToTask(), the action item's linkedTaskId SHALL match the provided taskId.
**Validates: Requirements 2.6, 4.11**

### Property 8: Attendance Status Validation
*For any* attendance update, if the status is not one of (invited, accepted, declined, attended, absent), the update SHALL be rejected.
**Validates: Requirements 5.7**

### Property 9: Meeting Title Validation
*For any* meeting creation attempt with an empty or missing title, the creation SHALL be rejected.
**Validates: Requirements 5.1**

### Property 10: Meeting Time Validation
*For any* meeting creation with both startTime and endTime, if endTime is not after startTime, the creation SHALL be rejected.
**Validates: Requirements 5.3**

### Property 11: Notes Size Validation
*For any* meeting notes save attempt with content larger than 50KB, the save SHALL be rejected.
**Validates: Requirements 5.4**

### Property 12: Action Item Status Validation
*For any* action item status update with a value not in (pending, in_progress, completed, cancelled), the update SHALL be rejected.
**Validates: Requirements 5.6**

### Property 13: Notes Updated Event Emission
*For any* meeting notes save operation, a 'meeting:notes-updated' socket event SHALL be emitted to all participants in the meeting.
**Validates: Requirements 6.1**

### Property 14: Action Item Created Event Emission
*For any* action item creation, a 'meeting:action-item-created' socket event SHALL be emitted with the new item details.
**Validates: Requirements 6.2**

### Property 15: Attendance Updated Event Emission
*For any* attendance status update, a 'meeting:attendance-updated' socket event SHALL be emitted to all participants.
**Validates: Requirements 6.4**

### Property 16: API Response Type Validation
*For any* API response from meeting endpoints, the response structure SHALL match the expected TypeScript interface.
**Validates: Requirements 7.3**

### Property 17: Provider Selection Persistence
*For any* meeting created with a specific meetingProvider, when retrieved via getMeeting(), the meetingProvider field SHALL match the value provided during creation.
**Validates: Requirements 3.2**

### Property 18: Consent Preference Persistence
*For any* meeting created with recording/transcription consent preferences, when retrieved, the consent values SHALL match what was provided.
**Validates: Requirements 3.7**

## Error Handling

**Join Flow Errors:**
- Meeting not found → 404
- User not workspace member → 403
- Invalid consent data → 400

**Meeting Management Errors:**
- Meeting not found → 404
- Unauthorized (not organizer/omni) → 403
- Invalid status transition → 400
- Meeting already ended → 400

**Notes Errors:**
- Meeting not found → 404
- Content too large → 413
- Invalid content format → 400

**Action Items Errors:**
- Meeting not found → 404
- Item not found → 404
- Invalid status → 400
- Invalid assignee → 400
- Task not found (when linking) → 404

**Validation Errors:**
- All validation errors return 400 with descriptive message
- Include field name and constraint in error message

## Testing Strategy

### Unit Tests
- Validation functions for all inputs
- Meeting status transitions
- Action item status transitions
- Notes content validation
- Attendance status validation

### Property-Based Tests
- Join flow exclusivity (Property 1)
- Provider-specific responses (Properties 2, 3)
- Notes round-trip persistence (Property 5)
- Action item creation and retrieval (Property 6)
- Linking operations (Property 7)
- Status validations (Properties 8, 12)
- Title validation (Property 9)
- Time validation (Property 10)
- Notes size validation (Property 11)
- Event emissions (Properties 13, 14, 15)
- API response types (Property 16)
- Provider persistence (Property 17)
- Consent persistence (Property 18)

### Integration Tests
- Complete join flow (internal and external)
- Meeting creation with all options
- Notes save and retrieval
- Action item lifecycle
- Real-time event propagation
- Attendance tracking

### Configuration
- Minimum 100 iterations per property test
- Tag format: `Feature: meetings-completion, Property N: [property text]`
- Each property test validates one specific correctness property
