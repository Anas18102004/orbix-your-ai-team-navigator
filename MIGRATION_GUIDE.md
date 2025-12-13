# Migration Guide for Orbix Workspace & Channel Updates

## Overview
This migration updates the Orbix codebase to support workspace-grouped channels, role-based team visibility, DMs, and AI privacy controls.

## Database Schema Changes

### New Collections
1. **DirectMessage** - For private DMs between users
2. **AIContextDoc** - For AI-generated summaries and context
3. **AuditLog** - For tracking all sensitive actions

### Updated Collections
1. **Channel** - Added `displayName`, `slug`, `memberCount`, changed `type` enum from `['group', 'dm']` to `['channel', 'private_channel']`
2. **Message** - Added `allowAi` field, made `workspaceId` optional (for global DMs)
3. **WorkspaceMembership** - Already has required fields

## Migration Steps

### 1. Run Channel Migration
```bash
# From server directory
npx ts-node server/scripts/migrate-channels.ts
```

This will:
- Ensure all channels have `workspaceId` (or report orphans)
- Backfill `aiMode = 'off'` default
- Update `type` enum from `'group'|'dm'` to `'channel'|'private_channel'`
- Generate `slug` for existing channels
- Update `memberCount` from `memberIds.length`

### 2. Verify Migration
Check the console output for:
- ✅ Number of channels updated
- ⚠️  Orphaned channels (if any - these need manual fix)
- ❌ Errors (if any)

### 3. Manual Fixes (if needed)
If orphaned channels are reported:
1. Identify which workspace they should belong to
2. Update them manually in MongoDB:
```javascript
db.channels.updateOne(
  { _id: ObjectId("...") },
  { $set: { workspaceId: ObjectId("...") } }
)
```

## Backend Changes

### New Routes
- `POST /api/chats/new` - Create new DM or private channel
- `POST /api/dms` - Create/get DM
- `GET /api/dms/:dmId/messages` - Get DM messages
- `POST /api/dms/:dmId/messages` - Send DM message (with `allowAi` flag)
- `GET /api/workspaces/:id/updates` - Get project updates
- `POST /api/workspaces/:id/updates/generate` - Generate AI summary
- `PATCH /api/channels/:channelId` - Update channel AI mode

### Updated Routes
- `GET /api/workspaces/:id/channels` - Now returns workspace context
- `GET /api/workspaces/:id/members` - Now returns role-based data (Crew sees limited, Omni/Org Admin see full)
- `POST /api/workspaces/:id/channels/:id/messages` - Now accepts `allowAi` flag

## Frontend Changes

### New Components
- `NewChatModal` - Modal for creating new DMs/private channels
- `ProjectUpdates` - New page for AI summaries and timeline

### Updated Components
- `Chat` - Now shows workspace context in headers, AI mode badges, "+ New Chat" button
- `Team` - Now has tabs (Members/Manage/Insights), role-based visibility

## Permission Model

### Org Admin
- Can create org, create workspace
- Can invite org_admin/omni/crew
- Can promote/demote Omnis
- Can remove Omnis/crew
- Can change channel AI mode

### Omni
- Can invite crew (for their workspace)
- Can remove crew
- Can update specialization for crew
- Can manage workspace settings
- Can change channel AI mode
- **Cannot** invite Omni or promote to Omni

### Crew
- Can view team members (limited info: name, role, specialization, online status)
- **Cannot** invite, promote/demote, or edit member details
- Can see channels in their workspace
- Can send messages

## AI Privacy Rules

1. **Channel Messages**: Only processed if `channel.aiMode === 'active'`
2. **DM Messages**: **NOT** processed unless `message.allowAi === true`
3. **Private Channels**: Default to `aiMode = 'off'`
4. **Audit Logging**: All AI reads are logged to `auditLogs` collection

## Testing Checklist

- [ ] Run migration script successfully
- [ ] Channels grouped by workspace in sidebar
- [ ] Channel header shows "Workspace Name • #channel"
- [ ] Team page visible to Crew (limited info)
- [ ] Team page shows full info to Omni/Org Admin
- [ ] Tabs work on Team page (Members/Manage/Insights)
- [ ] "+ New Chat" button creates DM or private channel
- [ ] DM messages NOT processed by AI unless allowAi=true
- [ ] "Ask Orbix" button in DM composer works
- [ ] AI consent banner shows in DM messages
- [ ] Project Updates page loads and generates summaries
- [ ] Channel AI mode toggle works (Omni+ only)
- [ ] Audit logs are created for sensitive actions

## Rollback Plan

If issues occur:
1. Restore database from backup
2. Revert code changes
3. Investigate issues in audit logs

## Notes

- DMs are stored separately from channels (DirectMessage model)
- Old `type: 'dm'` channels should be migrated to DirectMessage collection separately (not in this migration)
- AI processing pipeline should respect `channel.aiMode` and `message.allowAi` flags
- All sensitive actions are logged to `auditLogs` for compliance
