# Workspace Invite System

## Overview
The Orbix workspace invite system supports both email-based invites and invite codes, with real-time updates via WebSocket.

## Features

### 1. Email Invites
- **Endpoint**: `POST /api/workspaces/:workspaceId/invites/email`
- **Functionality**:
  - Sends email invitation to the specified email address
  - Creates an invite code automatically
  - Creates in-app notification if user already exists in system
  - Real-time updates via WebSocket

### 2. Invite Codes
- **Endpoint**: `POST /api/workspaces/:workspaceId/invites`
- **Functionality**:
  - Generates unique invite code
  - Can be shared manually
  - Real-time updates via WebSocket

### 3. Join Workspace
- **Endpoint**: `POST /api/workspaces/join`
- **Functionality**:
  - User joins workspace using invite code
  - Creates WorkspaceMembership with 'crew' role
  - Sends notifications to omni members about new member
  - Real-time updates via WebSocket

## Real-Time Updates

### WebSocket Events

1. **Invite Created**: `invite:new`
   - Emitted when a new invite is created
   - Sent to all workspace members
   - Payload: `{ invite: { _id, code, workspaceId, createdBy, createdAt } }`

2. **Membership Changed**: `workspace:membership:changed`
   - Emitted when a user joins or leaves a workspace
   - Sent to the affected user
   - Payload: `{ action: 'insert' | 'delete', membership: {...} }`

3. **Notification Created**: `notification:new`
   - Emitted when a new notification is created
   - Sent to the specific user
   - Payload: `{ notification: {...} }`

## Email Configuration

To enable email sending, configure the following environment variables in `.env`:

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_NAME=Orbix
```

### Gmail Setup
1. Enable 2-factor authentication
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the app password as `SMTP_PASS`

### Other Email Providers
- **SendGrid**: Use `smtp.sendgrid.net` with port 587
- **AWS SES**: Use your SES SMTP endpoint
- **Mailgun**: Use `smtp.mailgun.org` with port 587

## Workspace Creator Role

**The workspace creator automatically gets the 'omni' role** when creating a workspace. This is implemented in `server/routes/workspaces.ts`:

```typescript
// Create membership with omni role
const membership = new WorkspaceMembership({
  workspaceId: workspace._id,
  userId,
  role: 'omni',
});
```

## Notification Types

The system supports the following notification types:
- `TASK_ASSIGNED`
- `TASK_UPDATED`
- `MESSAGE`
- `MENTION`
- `INVITE` (new)

## MongoDB Change Streams

The system uses MongoDB change streams for real-time updates:
- **Messages**: Real-time message updates
- **Tasks**: Real-time task updates
- **Notifications**: Real-time notification delivery
- **WorkspaceMemberships**: Real-time membership changes
- **Invites**: Real-time invite creation

**Note**: Change streams require a MongoDB replica set. See `README_BACKEND.md` for setup instructions.

## Frontend Integration

### Invite by Email
```typescript
await apiClient.inviteByEmail(workspaceId, email);
```

### Create Invite Code
```typescript
await apiClient.createInvite(workspaceId);
```

### Join Workspace
```typescript
await apiClient.joinWorkspace(inviteCode);
```

## UI Components

The Team page (`src/pages/Team.tsx`) includes:
- **Invite by Email** button: Opens dialog to enter email
- **Create Invite Code** button: Generates and displays invite code
- Real-time member list updates
- Email invite dialog with validation

## Error Handling

- Email sending failures don't block invite creation
- If email fails, the invite code is still created and can be shared manually
- Invalid email addresses are validated before sending
- Duplicate memberships are prevented

