# Implementation Plan: Meetings Feature Completion

## Overview

This plan breaks down the Meetings feature completion into discrete, incremental tasks. Each task builds on previous work, with property-based tests validating correctness properties alongside implementation. Tasks are organized by feature area with checkpoints to ensure progress.

## Tasks

- [x] 1. Fix Critical Join Flow Bug
  - [x] 1.1 Update backend join endpoint to return discriminated response
    - Modify `/api/meetings/:meetingId/join` to check meetingProvider
    - Return SFU info for internal/null providers
    - Return providerJoinUrl for external providers
    - Never return both simultaneously
    - _Requirements: 1.1, 1.2, 1.3, 1.5_
  
  - [x] 1.2 Write property test for join flow exclusivity
    - **Property 1: Join Flow Exclusivity**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.5**
  
  - [x] 1.3 Update frontend join flow in MeetingRoom.tsx
    - Check response type from joinMeeting()
    - If providerJoinUrl exists, redirect to external provider
    - If SFU info exists, proceed with internal room
    - Never open both simultaneously
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 1.4 Write property test for provider-specific responses
    - **Property 2: Provider-Specific Join Response**
    - **Property 3: External Provider Join Response**
    - **Validates: Requirements 1.2, 1.4, 1.5**

- [x] 2. Checkpoint - Join Flow Tests Pass
  - Ensure all join flow tests pass, ask the user if questions arise.

- [x] 3. Implement Backend Meeting Management APIs
  - [x] 3.1 Create MeetingService for business logic
    - Implement updateMeeting() with validation
    - Implement cancelMeeting() with status transition
    - Implement completeMeeting() with status transition
    - Implement updateAttendance() with validation
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [x] 3.2 Add backend routes for meeting management
    - PUT `/api/meetings/:meetingId` - Update meeting
    - POST `/api/meetings/:meetingId/cancel` - Cancel meeting
    - POST `/api/meetings/:meetingId/complete` - Complete meeting
    - PUT `/api/meetings/:meetingId/attendance` - Update attendance
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [x] 3.3 Write property tests for meeting management
    - **Property 9: Meeting Title Validation**
    - **Property 10: Meeting Time Validation**
    - **Property 8: Attendance Status Validation**
    - **Validates: Requirements 5.1, 5.3, 5.7_

- [x] 4. Implement Backend Meeting Notes APIs
  - [x] 4.1 Create MeetingNotesService
    - Implement getMeetingNotes() with retrieval
    - Implement saveMeetingNotes() with validation (max 50KB)
    - Implement notes sections (discussion, decisions, risks, followups)
    - _Requirements: 4.5, 4.6_
  
  - [x] 4.2 Add backend routes for notes
    - GET `/api/meetings/:meetingId/notes` - Get notes
    - POST `/api/meetings/:meetingId/notes` - Save notes
    - _Requirements: 4.5, 4.6_
  
  - [x] 4.3 Write property tests for notes persistence
    - **Property 5: Notes Persistence Round Trip**
    - **Property 11: Notes Size Validation**
    - **Validates: Requirements 2.3, 4.6, 5.4_

- [x] 5. Implement Backend Action Items APIs
  - [x] 5.1 Create ActionItemService
    - Implement getMeetingActionItems() with retrieval
    - Implement createActionItem() with validation
    - Implement updateActionItem() with status validation
    - Implement deleteActionItem() with deletion
    - Implement linkActionItemToTask() with task linking
    - _Requirements: 4.7, 4.8, 4.9, 4.10, 4.11_
  
  - [x] 5.2 Add backend routes for action items
    - GET `/api/meetings/:meetingId/action-items` - List items
    - POST `/api/meetings/:meetingId/action-items` - Create item
    - PUT `/api/meetings/:meetingId/action-items/:itemId` - Update item
    - DELETE `/api/meetings/:meetingId/action-items/:itemId` - Delete item
    - POST `/api/meetings/:meetingId/action-items/:itemId/link` - Link to task
    - _Requirements: 4.7, 4.8, 4.9, 4.10, 4.11_
  
  - [x] 5.3 Write property tests for action items
    - **Property 6: Action Item Creation and Retrieval**
    - **Property 7: Action Item to Task Linking**
    - **Property 12: Action Item Status Validation**
    - **Validates: Requirements 2.5, 2.6, 4.8, 4.11, 5.6_

- [x] 6. Checkpoint - Backend APIs Complete
  - Ensure all backend tests pass, ask the user if questions arise.

- [x] 7. Add API Client Methods
  - [x] 7.1 Add meeting management methods to apiClient
    - updateMeeting()
    - cancelMeeting()
    - completeMeeting()
    - updateAttendance()
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [x] 7.2 Add notes methods to apiClient
    - getMeetingNotes()
    - saveMeetingNotes()
    - _Requirements: 4.5, 4.6_
  
  - [x] 7.3 Add action items methods to apiClient
    - getMeetingActionItems()
    - createActionItem()
    - updateActionItem()
    - deleteActionItem()
    - linkActionItemToTask()
    - _Requirements: 4.7, 4.8, 4.9, 4.10, 4.11_

- [x] 8. Implement Socket.IO Real-time Events
  - [x] 8.1 Add socket event handlers for notes updates
    - Emit 'meeting:notes-updated' when notes saved
    - Broadcast to all meeting participants
    - _Requirements: 6.1_
  
  - [x] 8.2 Add socket event handlers for action items
    - Emit 'meeting:action-item-created' when item created
    - Emit 'meeting:action-item-updated' when item updated
    - Broadcast to all meeting participants
    - _Requirements: 6.2, 6.3_
  
  - [x] 8.3 Add socket event handlers for attendance
    - Emit 'meeting:attendance-updated' when status changes
    - Broadcast to all meeting participants
    - _Requirements: 6.4_
  
  - [x] 8.4 Write property tests for event emissions
    - **Property 13: Notes Updated Event Emission**
    - **Property 14: Action Item Created Event Emission**
    - **Property 15: Attendance Updated Event Emission**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4_

- [-] 9. Enhance ScheduleMeetingModal Component
  - [~] 9.1 Add video provider selector
    - Display options: None, Built-in, Zoom, Google Meet
    - Store selection in form state
    - Pass to backend on creation
    - _Requirements: 3.1, 3.2_
  
  - [~] 9.2 Add participant role selector
    - Display role options for each participant
    - Store role selection
    - Pass to backend on creation
    - _Requirements: 3.3_
  
  - [~] 9.3 Add recurrence selector
    - Display options: Daily, Weekly, Monthly, Custom
    - Store recurrence rule
    - Pass to backend on creation
    - _Requirements: 3.4_
  
  - [~] 9.4 Add timezone selector
    - Display common timezones
    - Store timezone selection
    - Pass to backend on creation
    - _Requirements: 3.5_
  
  - [~] 9.5 Add consent checkboxes
    - Display recording consent checkbox
    - Display transcription consent checkbox
    - Store preferences
    - Pass to backend on creation
    - _Requirements: 3.6, 3.7_
  
  - [~] 9.6 Write property tests for modal functionality
    - **Property 17: Provider Selection Persistence**
    - **Property 18: Consent Preference Persistence**
    - **Validates: Requirements 3.2, 3.7_

- [x] 10. Create MeetingDetailPage Component
  - [x] 10.1 Create page structure and layout
    - Display meeting header with title, agenda, organizer
    - Display participant list with status
    - Display meeting status badge
    - _Requirements: 2.1_
  
  - [x] 10.2 Implement meeting notes section
    - Display notes editor component
    - Load notes on page load
    - Save notes with auto-save debounce
    - Display sections: Discussion, Decisions, Risks, Followups
    - _Requirements: 2.2, 2.3_
  
  - [x] 10.3 Implement action items section
    - Display list of action items
    - Show status badges and assignees
    - Implement create action item form
    - Implement edit/delete inline
    - _Requirements: 2.4, 2.5_
  
  - [x] 10.4 Implement action item to task linking
    - Add "Link to Task" button for each action item
    - Display modal to select existing task
    - Save link to backend
    - _Requirements: 2.6_
  
  - [x] 10.5 Implement attendance tracking panel
    - Display list of participants with status
    - Show join times
    - Display status badges
    - _Requirements: 2.7_
  
  - [x] 10.6 Implement AI summary display
    - Display summary if aiSummaryId exists
    - Show summary content in readable format
    - _Requirements: 2.8_
  
  - [x] 10.7 Write property tests for detail page
    - **Property 4: Meeting Detail Page Completeness**
    - **Validates: Requirements 2.1, 2.4, 2.7_

- [x] 11. Implement MeetingNotesEditor Component
  - [x] 11.1 Create rich text editor component
    - Use Slate or similar library
    - Support formatting (bold, italic, lists, etc.)
    - Display character count
    - _Requirements: 2.2, 2.3_
  
  - [x] 11.2 Implement auto-save functionality
    - Debounce saves (500ms)
    - Show save status indicator
    - Handle save errors gracefully
    - _Requirements: 2.3_
  
  - [x] 11.3 Implement section-based editing
    - Support sections: Discussion, Decisions, Risks, Followups
    - Allow toggling sections on/off
    - Save each section separately
    - _Requirements: 2.2_

- [x] 12. Implement ActionItemsPanel Component
  - [x] 12.1 Create action items list component
    - Display items with title, assignee, due date, status
    - Show status badges (pending, in_progress, completed, cancelled)
    - Implement inline edit/delete
    - _Requirements: 2.4, 2.5_
  
  - [x] 12.2 Create action item creation form
    - Input fields: title, description, assignee, due date
    - Validation on client side
    - Submit to backend
    - _Requirements: 2.5_
  
  - [x] 12.3 Implement status update functionality
    - Allow changing status via dropdown
    - Update backend on change
    - Show loading state
    - _Requirements: 2.5_

- [x] 13. Implement AttendancePanel Component
  - [x] 13.1 Create attendance display component
    - List all participants with status
    - Show join times
    - Display status badges
    - _Requirements: 2.7_
  
  - [x] 13.2 Implement real-time attendance updates
    - Listen for 'meeting:attendance-updated' events
    - Update UI when attendance changes
    - _Requirements: 2.7, 6.4_

- [ ] 14. Implement Real-time Updates in Frontend
  - [~] 14.1 Add socket listeners in MeetingDetailPage
    - Listen for 'meeting:notes-updated'
    - Listen for 'meeting:action-item-created'
    - Listen for 'meeting:action-item-updated'
    - Listen for 'meeting:attendance-updated'
    - Update UI state on events
    - _Requirements: 6.5_
  
  - [~] 14.2 Implement optimistic updates
    - Update UI immediately on user action
    - Revert on error
    - Show loading states
    - _Requirements: 6.5_

- [~] 15. Checkpoint - Frontend Features Complete
  - Ensure all frontend tests pass, ask the user if questions arise.

- [ ] 16. Add Validation and Error Handling
  - [~] 16.1 Add backend validation for all inputs
    - Meeting creation: title, times, participants
    - Notes: content size (max 50KB)
    - Action items: title, status, assignee
    - Attendance: status values
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  
  - [~] 16.2 Add frontend validation
    - Show validation errors to user
    - Disable submit buttons when invalid
    - Provide helpful error messages
    - _Requirements: 5.1, 5.4, 5.5_
  
  - [~] 16.3 Write property tests for validation
    - **Property 9: Meeting Title Validation**
    - **Property 10: Meeting Time Validation**
    - **Property 11: Notes Size Validation**
    - **Property 12: Action Item Status Validation**
    - **Validates: Requirements 5.1, 5.3, 5.4, 5.6, 5.7_

- [ ] 17. Add Type Safety and API Response Validation
  - [~] 17.1 Define TypeScript interfaces for all meeting types
    - Meeting, ParticipantInfo, MeetingNotes, ActionItem
    - Use discriminated unions for provider types
    - _Requirements: 7.1, 7.4_
  
  - [~] 17.2 Add response validation in apiClient
    - Validate all meeting API responses
    - Throw errors on type mismatch
    - _Requirements: 7.3_
  
  - [~] 17.3 Write property test for API response types
    - **Property 16: API Response Type Validation**
    - **Validates: Requirements 7.3_

- [ ] 18. Final Integration and Testing
  - [~] 18.1 Test complete join flow (internal and external)
    - Create meeting with internal provider
    - Create meeting with external provider
    - Verify correct flow for each
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [~] 18.2 Test meeting detail page end-to-end
    - Create meeting
    - Navigate to detail page
    - Add notes, action items, verify display
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [~] 18.3 Test real-time updates
    - Open meeting in two tabs
    - Make changes in one tab
    - Verify updates appear in other tab
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [~] 18.4 Test error handling
    - Try invalid inputs
    - Verify error messages
    - Verify system recovers gracefully
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [~] 19. Final Checkpoint - All Tests Pass
  - Ensure all tests pass (unit, property, integration), ask the user if questions arise.

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- All code must be type-safe with no `any` types
- Clean separation: UI components use apiClient, no business logic in components
