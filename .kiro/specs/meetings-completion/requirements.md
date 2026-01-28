# Requirements Document: Meetings Feature Completion

## Introduction

The Meetings feature is mostly implemented but has critical bugs and incomplete features. This spec addresses:
1. **Critical Bug**: Join flow opens both internal and external meetings simultaneously
2. **Incomplete Frontend**: Meeting detail page, creation modal enhancements, notes/action items UI
3. **Missing API Methods**: Backend endpoints for notes, action items, and meeting management
4. **Real-time Updates**: Socket.IO event handling for collaborative features

The system is designed to work perfectly without external providers (Zoom, Google Meet) - they are optional enhancements. A meeting is an execution trigger for clarity, decisions, action items, and accountability.

## Glossary

- **Meeting**: A scheduled or instant synchronous session for team coordination
- **Internal Meeting**: Video meeting using mediasoup-based SFU (built-in)
- **External Meeting**: Video meeting via Zoom or Google Meet (optional)
- **Meeting Provider**: The video platform selected (internal, zoom, google_meet, or null)
- **Join Flow**: The process of a user entering a meeting room
- **Meeting Detail Page**: Dedicated page showing meeting info, notes, action items, attendance
- **Action Item**: A task created during or after a meeting, optionally linked to workspace tasks
- **Meeting Notes**: Rich text notes captured during a meeting with sections (discussion, decisions, risks, followups)
- **Attendance**: Tracking which participants joined and their status (invited, accepted, declined, attended, absent)

## Requirements

### Requirement 1: Fix Critical Join Flow Bug

**User Story:** As a user, I want to join a meeting and open ONLY the correct video platform, so that I don't have multiple windows/tabs open simultaneously.

#### Acceptance Criteria

1. WHEN a user clicks "Join Meeting" and meetingProvider is null or 'internal', THE System SHALL open ONLY the internal mediasoup-based meeting room
2. WHEN a user clicks "Join Meeting" and meetingProvider is 'zoom' or 'google_meet', THE System SHALL open ONLY the external provider's join URL in a new tab/window
3. WHEN a user clicks "Join Meeting", THE System SHALL NOT open both internal and external meetings simultaneously
4. WHEN the backend returns joinData with providerJoinUrl, THE Frontend SHALL redirect to that URL instead of opening the internal room
5. WHEN meetingProvider is null or 'internal', THE Backend SHALL NOT return a providerJoinUrl in the join response

### Requirement 2: Frontend Meeting Detail Page

**User Story:** As a user, I want to view comprehensive meeting information including notes, action items, and attendance, so that I can track meeting outcomes and follow-ups.

#### Acceptance Criteria

1. WHEN a user navigates to a meeting detail page, THE System SHALL display meeting title, agenda, organizer, participants, and status
2. WHEN a user views the meeting detail page, THE System SHALL display a "Meeting Notes" section with rich text editor
3. WHEN a user edits meeting notes, THE System SHALL save changes to the backend and persist them
4. WHEN a user views the meeting detail page, THE System SHALL display an "Action Items" section with a list of items
5. WHEN a user creates a new action item, THE System SHALL add it to the meeting and allow assignment and due date setting
6. WHEN a user clicks "Link to Task", THE System SHALL allow linking an action item to an existing workspace task
7. WHEN a user views the meeting detail page, THE System SHALL display attendance tracking showing who joined and their status
8. WHEN a meeting has ended, THE System SHALL display the AI-generated summary if available

### Requirement 3: Enhanced Meeting Creation Modal

**User Story:** As a user, I want to configure all meeting options when scheduling, so that I can set up meetings with the right provider, participants, and settings.

#### Acceptance Criteria

1. WHEN a user opens the schedule meeting modal, THE System SHALL display a "Video Provider" selector with options (None, Built-in, Zoom, Google Meet)
2. WHEN a user selects a video provider, THE System SHALL store the selection and pass it to the backend
3. WHEN a user opens the schedule meeting modal, THE System SHALL display a "Participant Roles" selector for each participant (organizer, host, participant, observer)
4. WHEN a user opens the schedule meeting modal, THE System SHALL display a "Recurrence" selector for daily, weekly, monthly, or custom patterns
5. WHEN a user opens the schedule meeting modal, THE System SHALL display a "Timezone" selector with common timezones
6. WHEN a user opens the schedule meeting modal, THE System SHALL display consent checkboxes for recording and transcription
7. WHEN a user selects recording consent, THE System SHALL store the preference and enforce it during the meeting

### Requirement 4: API Client Methods for Meeting Management

**User Story:** As a frontend developer, I want complete API client methods for meeting operations, so that I can implement all meeting features without gaps.

#### Acceptance Criteria

1. THE System SHALL provide updateMeeting() method to modify meeting details (title, agenda, participants, times)
2. THE System SHALL provide cancelMeeting() method to cancel a scheduled meeting
3. THE System SHALL provide completeMeeting() method to explicitly mark a meeting as complete
4. THE System SHALL provide updateAttendance() method to update participant attendance status
5. THE System SHALL provide getMeetingNotes() method to retrieve meeting notes
6. THE System SHALL provide saveMeetingNotes() method to save or update meeting notes with rich text content
7. THE System SHALL provide getMeetingActionItems() method to retrieve all action items for a meeting
8. THE System SHALL provide createActionItem() method to create a new action item with title, description, assignee, due date
9. THE System SHALL provide updateActionItem() method to modify action item details and status
10. THE System SHALL provide deleteActionItem() method to remove an action item
11. THE System SHALL provide linkActionItemToTask() method to link an action item to a workspace task

### Requirement 5: Backend Validation for Meeting Operations

**User Story:** As a backend developer, I want robust validation for all meeting operations, so that data integrity is maintained.

#### Acceptance Criteria

1. WHEN creating a meeting, THE System SHALL validate that title is non-empty and required
2. WHEN creating a meeting, THE System SHALL validate that startTime is in the future (if provided)
3. WHEN creating a meeting, THE System SHALL validate that endTime is after startTime (if both provided)
4. WHEN saving meeting notes, THE System SHALL validate that content is not excessively large (max 50KB)
5. WHEN creating an action item, THE System SHALL validate that title is non-empty and required
6. WHEN updating an action item status, THE System SHALL validate that status is one of: pending, in_progress, completed, cancelled
7. WHEN updating attendance, THE System SHALL validate that attendanceStatus is one of: invited, accepted, declined, attended, absent

### Requirement 6: Real-time Updates via Socket.IO

**User Story:** As a user, I want real-time updates when meeting notes, action items, or attendance changes, so that all participants see changes immediately.

#### Acceptance Criteria

1. WHEN a user saves meeting notes, THE System SHALL emit 'meeting:notes-updated' event to all participants in the meeting
2. WHEN a user creates an action item, THE System SHALL emit 'meeting:action-item-created' event with the new item details
3. WHEN a user updates an action item, THE System SHALL emit 'meeting:action-item-updated' event with the updated item
4. WHEN a user updates their attendance status, THE System SHALL emit 'meeting:attendance-updated' event to all participants
5. WHEN a participant receives a real-time event, THE Frontend SHALL update the UI without requiring a page refresh

### Requirement 7: Type Safety and Code Quality

**User Story:** As a developer, I want type-safe implementations throughout the codebase, so that bugs are caught at compile time.

#### Acceptance Criteria

1. THE System SHALL use TypeScript interfaces for all meeting-related data structures
2. THE System SHALL have no `any` types in meeting-related code (except where unavoidable)
3. THE System SHALL validate all API responses match expected types
4. THE System SHALL use discriminated unions for meeting provider types (internal | zoom | google_meet | null)
5. THE System SHALL use strict null checks for optional fields

### Requirement 8: Clean Separation of Concerns

**User Story:** As a developer, I want clean code organization with clear separation between UI, API, and business logic, so that the codebase is maintainable.

#### Acceptance Criteria

1. THE Frontend meeting components SHALL NOT contain API logic (use apiClient)
2. THE Frontend meeting components SHALL NOT contain business logic (use hooks or services)
3. THE Backend meeting routes SHALL delegate to service layer for complex operations
4. THE Meeting service layer SHALL handle validation and business rules
5. THE Socket.IO handlers SHALL be separate from HTTP route handlers
