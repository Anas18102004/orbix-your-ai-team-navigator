# Backend Integration Guide

This guide explains how to integrate the Orbix AI Orchestrator with your existing Node.js backend.

## Required Backend Changes

The AI service expects certain endpoints and data structures. You'll need to add these to your backend:

### 1. Workspace Configuration Endpoint

The AI service needs to know the workspace's `aiAutomationMode`. Add this field to your Workspace model:

```typescript
// server/models/Workspace.ts
export interface IWorkspace extends Document {
  // ... existing fields
  aiAutomationMode?: 'assist' | 'semi_auto' | 'full_auto';
}
```

Update the schema:
```typescript
aiAutomationMode: {
  type: String,
  enum: ['assist', 'semi_auto', 'full_auto'],
  default: 'assist'
}
```

### 2. Channel Configuration

The Channel model already has `aiMode`, which is good. Make sure it's accessible via API.

### 3. Task Proposal Support

The AI service creates "proposals" in Assist mode. You can either:

**Option A:** Create tasks with a special status or flag:
```typescript
// Add to Task model
isProposal?: boolean;
proposalStatus?: 'pending' | 'approved' | 'rejected';
```

**Option B:** Create a separate TaskProposal model (recommended for clarity).

### 4. Bot User for Messages

The AI service needs to post bot messages. Create a system user:

```typescript
// Create a bot user in your database
const botUser = await User.findOneAndUpdate(
  { email: 'orbix-ai@system' },
  {
    name: 'Orbix AI',
    email: 'orbix-ai@system',
    password: 'system', // or use a special flag
    isSystem: true
  },
  { upsert: true, new: true }
);
```

Then use this user's ID when posting bot messages.

### 5. Webhook/Middleware for Message Processing

Add middleware to call the AI service when messages are created:

```typescript
// server/routes/messages.ts
import axios from 'axios';

// After creating a message
router.post('/:workspaceId/channels/:channelId/messages', ..., async (req, res) => {
  // ... existing message creation code ...
  
  // Call AI service if channel has AI active
  if (channel.aiMode === 'active') {
    // Call asynchronously (don't block response)
    setImmediate(async () => {
      try {
        await axios.post(
          `${process.env.AI_SERVICE_URL || 'http://localhost:8000'}/ai/chat_to_task`,
          {
            message_id: message._id.toString(),
            workspace_id: workspaceId,
            channel_id: channelId,
            text: content,
            sender_id: userId.toString(),
            sender_name: sender.name,
            channel_name: channel.name
          },
          {
            headers: {
              'X-API-Key': process.env.AI_SERVICE_API_KEY || ''
            }
          }
        );
      } catch (error) {
        console.error('AI service error:', error);
        // Don't fail the message creation if AI fails
      }
    });
  }
  
  // ... return response ...
});
```

### 6. Environment Variables

Add to your backend `.env`:

```env
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_API_KEY=your_api_key_here
```

### 7. Task Help Endpoint (Frontend Integration)

When a user clicks "Ask Orbix" on a task, call:

```typescript
// In your frontend or backend
const response = await fetch(`${AI_SERVICE_URL}/ai/task_help`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': AI_SERVICE_API_KEY
  },
  body: JSON.stringify({
    workspace_id: workspaceId,
    task_id: taskId,
    user_id: userId,
    question: userQuestion // optional
  })
});
```

### 8. Ask Orbix Chat Integration

Add a chat interface that calls:

```typescript
const response = await fetch(`${AI_SERVICE_URL}/ai/ask_orbix`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': AI_SERVICE_API_KEY
  },
  body: JSON.stringify({
    workspace_id: workspaceId,
    user_id: userId,
    message: userMessage,
    history: chatHistory // optional
  })
});
```

### 9. Insights Endpoint (Omni Only)

```typescript
// Only allow for Omni users
if (membership.role !== 'omni') {
  return res.status(403).json({ error: 'Omni role required' });
}

const response = await fetch(`${AI_SERVICE_URL}/ai/insights`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': AI_SERVICE_API_KEY
  },
  body: JSON.stringify({
    workspace_id: workspaceId,
    user_id: userId
  })
});
```

## Testing the Integration

1. Start the AI service:
```bash
cd ai_orchestrator
uvicorn ai_orchestrator.main:app --reload
```

2. Test the health endpoint:
```bash
curl http://localhost:8000/health
```

3. Test chat-to-task:
```bash
curl -X POST http://localhost:8000/ai/chat_to_task \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_key" \
  -d '{
    "message_id": "test123",
    "workspace_id": "ws123",
    "channel_id": "ch123",
    "text": "We need to fix the login bug urgently",
    "sender_id": "user123",
    "sender_name": "John Doe",
    "channel_name": "general"
  }'
```

## Error Handling

The AI service is designed to fail gracefully. If it's unavailable:

- Message creation should still succeed
- Tasks can still be created manually
- The system should continue to function without AI

Always wrap AI service calls in try-catch and don't block critical operations.

## Performance Considerations

- AI processing is async - don't block user actions
- Consider rate limiting for AI endpoints
- Cache workspace/channel configs to reduce API calls
- Use connection pooling for HTTP clients

## Security

- Always validate workspace membership before calling AI service
- Use API keys for service-to-service authentication
- Don't expose AI service directly to frontend (route through backend)
- Validate all inputs before sending to AI service

