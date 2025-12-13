# Orbix AI Orchestrator

A Python-based AI service for Orbix that uses LangGraph and LangChain to provide intelligent workspace automation.

## Overview

The Orbix AI Orchestrator is a separate microservice that implements the AI layer for Orbix workspaces. It uses:

- **LangGraph** for orchestrating multi-agent workflows
- **LangChain** for LLM integration and tools
- **Google Gemini** as the primary LLM
- **FastAPI** for HTTP endpoints

## Architecture

### Agents

The system implements 9 specialized agents:

1. **Message Understanding Agent** - Classifies messages and identifies task candidates
2. **Task Extraction Agent** - Extracts structured task information from messages
3. **Assignment Agent** - Suggests task assignments based on workload
4. **Task Helper Agent** - Provides guidance for task completion
5. **Workspace Assistant Agent** - Conversational agent for workspace questions
6. **Summarization Agent** - Summarizes threads and indexes for RAG
7. **Insights Agent** - Generates workspace insights (Omni-only)
8. **Safety & Policy Agent** - Enforces privacy and permission checks
9. **Feedback & Learning Agent** - Processes user feedback (future enhancement)

### Workflows (LangGraph)

Four main workflows:

1. **chat_to_task_graph** - Converts chat messages to tasks/proposals
2. **task_help_graph** - Provides task assistance
3. **ask_orbix_chat_graph** - Conversational workspace assistant
4. **insights_graph** - Generates workspace insights

### Modes

Three automation modes:

- **Assist** - Creates proposals only, requires human approval
- **Semi-Auto** - Auto-creates tasks when confidence is high (≥75%)
- **Full Auto** - Auto-creates tasks for high and medium confidence (≥60%)

## Setup

### Prerequisites

- Python 3.10+
- MongoDB (for vector search, optional)
- Google Gemini API key

### Installation

1. Install dependencies:

```bash
cd ai_orchestrator
pip install -r requirements.txt
```

2. Create a `.env` file:

```env
# Required
GEMINI_API_KEY=your_gemini_api_key_here
ORBIX_BACKEND_URL=http://localhost:3000

# Optional
MONGODB_URI=mongodb://localhost:27017/orbix
AI_SERVICE_PORT=8000
AI_SERVICE_HOST=0.0.0.0
AI_SERVICE_API_KEY=your_api_key_here
BACKEND_API_KEY=optional_backend_auth_key

# Model Configuration
GEMINI_MODEL=gemini-pro
GEMINI_TEMPERATURE=0.7

# RAG Configuration
VECTOR_SEARCH_COLLECTION=workspace_contexts
VECTOR_SEARCH_TOP_K=5

# Mode Thresholds
SEMI_AUTO_CONFIDENCE_THRESHOLD=0.75
FULL_AUTO_CONFIDENCE_THRESHOLD=0.6
```

3. Run the service:

```bash
# Development
uvicorn ai_orchestrator.main:app --reload

# Production
uvicorn ai_orchestrator.main:app --host 0.0.0.0 --port 8000
```

## API Endpoints

### POST `/ai/chat_to_task`

Process a chat message and potentially create a task or proposal.

**Request:**
```json
{
  "message_id": "msg123",
  "workspace_id": "ws123",
  "channel_id": "ch123",
  "text": "We need to fix the login bug",
  "sender_id": "user123",
  "sender_name": "John Doe",
  "channel_name": "general",
  "thread_context": "Previous messages..."
}
```

**Response:**
```json
{
  "success": true,
  "action_taken": "task_created",
  "task_id": "task123",
  "reason": "Semi-auto mode: high confidence (0.85)"
}
```

### POST `/ai/task_help`

Get help and guidance for a task.

**Request:**
```json
{
  "workspace_id": "ws123",
  "task_id": "task123",
  "user_id": "user123",
  "question": "How should I approach this?"
}
```

**Response:**
```json
{
  "success": true,
  "explanation": "This task involves...",
  "step_by_step_plan": [
    "Step 1: ...",
    "Step 2: ..."
  ],
  "risk_notes": ["Potential risk: ..."]
}
```

### POST `/ai/ask_orbix`

Ask Orbix a question about the workspace.

**Request:**
```json
{
  "workspace_id": "ws123",
  "user_id": "user123",
  "message": "What's blocking our release?",
  "history": []
}
```

**Response:**
```json
{
  "success": true,
  "answer": "Based on the workspace data...",
  "sources": ["task_context", "workspace_stats"],
  "suggested_actions": ["Review P0 tasks", "Check blockers"]
}
```

### POST `/ai/insights`

Generate workspace insights (Omni-only).

**Request:**
```json
{
  "workspace_id": "ws123",
  "user_id": "user123"
}
```

**Response:**
```json
{
  "success": true,
  "summary": "Workspace activity summary...",
  "actionable_suggestions": [
    "Suggestion 1",
    "Suggestion 2",
    "Suggestion 3"
  ],
  "metrics": {...}
}
```

## Integration with Orbix Backend

The AI service communicates with the Orbix backend via HTTP. The backend should:

1. Call `/ai/chat_to_task` when a new message is created in an AI-active channel
2. Call `/ai/task_help` when a user requests help on a task
3. Call `/ai/ask_orbix` when a user asks Orbix a question
4. Call `/ai/insights` when an Omni user requests insights

### Backend Integration Example

In your Node.js backend, add a webhook or middleware to call the AI service:

```typescript
// When a message is created in an AI-active channel
if (channel.aiMode === 'active') {
  await fetch('http://localhost:8000/ai/chat_to_task', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.AI_SERVICE_API_KEY
    },
    body: JSON.stringify({
      message_id: message._id.toString(),
      workspace_id: workspace._id.toString(),
      channel_id: channel._id.toString(),
      text: message.content,
      sender_id: message.senderId.toString(),
      sender_name: sender.name,
      channel_name: channel.name
    })
  });
}
```

## MongoDB Vector Search Setup

For RAG functionality, set up MongoDB Atlas Vector Search:

1. Create a vector search index on your MongoDB collection
2. Configure the `MONGODB_URI` in `.env`
3. The system will automatically index workspace context

## Development

### Project Structure

```
ai_orchestrator/
├── agents/          # Agent implementations
├── graphs/          # LangGraph workflows
├── models/          # LLM wrappers and schemas
├── prompts/         # Prompt templates
├── tools/           # LangChain tools
├── config.py        # Configuration
├── modes.py         # Mode logic
├── main.py          # FastAPI app
└── requirements.txt # Dependencies
```

### Adding a New Agent

1. Create a new file in `agents/`
2. Implement the agent function
3. Add it to the appropriate graph in `graphs/`
4. Update prompts in `prompts/agent_prompts.py`

### Testing

```bash
# Run tests (when implemented)
pytest

# Test API endpoints
curl -X POST http://localhost:8000/ai/chat_to_task \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_key" \
  -d '{"message_id": "test", ...}'
```

## Safety & Privacy

- All actions are gated by the Safety & Policy Agent
- Channel AI mode must be "active" for channel-based actions
- DMs require explicit user consent
- Workspace automation mode controls AI autonomy
- No personal attacks or people-shaming in outputs

## License

Part of the Orbix project.

