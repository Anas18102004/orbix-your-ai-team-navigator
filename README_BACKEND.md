# Orbix Backend

Complete backend implementation for Orbix with MongoDB, Express, Socket.IO, and realtime updates.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your MongoDB connection string and other settings
```

3. Make sure MongoDB is running:
```bash
# If using local MongoDB (standalone)
mongod

# OR set up a replica set for change streams (required for realtime features)
# See "Setting up MongoDB Replica Set" section below
```

4. Start the backend server:
```bash
npm run dev:server
```

The server will run on `http://localhost:3000` by default.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Workspaces
- `POST /api/workspaces` - Create workspace
- `GET /api/workspaces` - Get all workspaces for user
- `GET /api/workspaces/:id` - Get workspace details
- `POST /api/workspaces/:workspaceId/invites` - Create invite (Omni only)
- `POST /api/workspaces/join` - Join workspace with invite code
- `GET /api/workspaces/:workspaceId/members` - Get workspace members (Omni only)

### Channels
- `POST /api/workspaces/:workspaceId/channels` - Create channel
- `GET /api/workspaces/:workspaceId/channels` - Get channels for workspace

### Messages
- `GET /api/workspaces/:workspaceId/channels/:channelId/messages` - Get messages (paginated)
- `POST /api/workspaces/:workspaceId/channels/:channelId/messages` - Create message

### Tasks
- `GET /api/workspaces/:workspaceId/tasks` - Get tasks (filtered by role)
- `GET /api/workspaces/:workspaceId/tasks/my` - Get my tasks
- `POST /api/workspaces/:workspaceId/tasks` - Create task
- `PATCH /api/workspaces/:workspaceId/tasks/:taskId` - Update task

### Notifications
- `GET /api/notifications` - Get notifications
- `PATCH /api/notifications/:id/read` - Mark notification as read

## WebSocket Events

### Client → Server
- `workspace:join` - Join workspace room
- `workspace:leave` - Leave workspace room
- `channel:join` - Join channel room
- `channel:leave` - Leave channel room

### Server → Client
- `message:new` - New message in channel
- `task:created` - New task created
- `task:updated` - Task updated
- `notification:new` - New notification
- `workspace:membership:changed` - Workspace membership changed

## Database Models

- **User** - User accounts
- **Workspace** - Workspaces/teams
- **WorkspaceMembership** - User-workspace relationships with roles
- **Channel** - Chat channels (group or DM)
- **Message** - Chat messages
- **Task** - Tasks/todos
- **Notification** - User notifications
- **Invite** - Workspace invite codes

## Role-Based Access Control

- **Omni** - Full access, can manage workspace, create invites, see all tasks
- **Crew** - Standard member, can create/update own tasks, send messages
- **Guest** - Limited access (future use)

## Realtime Features

The backend uses MongoDB change streams to emit realtime events:
- New messages → `message:new` to channel room
- Task changes → `task:created`/`task:updated` to workspace room
- New notifications → `notification:new` to user room

## Setting up MongoDB Replica Set (for Realtime Features)

MongoDB change streams require a replica set. For local development, you can set up a single-node replica set:

1. **Stop your current MongoDB instance** (if running)

2. **Start MongoDB with replica set configuration:**
   ```bash
   mongod --replSet rs0 --port 27017 --dbpath /path/to/your/data/directory
   ```

3. **In a new terminal, connect to MongoDB and initialize the replica set:**
   ```bash
   mongosh
   ```
   Then run:
   ```javascript
   rs.initiate({
     _id: "rs0",
     members: [
       { _id: 0, host: "localhost:27017" }
     ]
   })
   ```

4. **Verify the replica set is running:**
   ```javascript
   rs.status()
   ```
   You should see `"stateStr": "PRIMARY"`

**Alternative: Use MongoDB Atlas**
- MongoDB Atlas provides replica sets by default
- Update `MONGODB_URI` in `.env` to your Atlas connection string

**Note:** Without a replica set, the server will still run, but realtime updates (WebSocket events) will be disabled. All REST API endpoints will work normally.

## Notes

- No AI integration yet - all AI features are placeholders
- JWT tokens stored in localStorage on frontend
- Passwords hashed with bcrypt
- All workspace-scoped endpoints require workspace membership
- **Realtime features require MongoDB replica set** - see above for setup instructions

