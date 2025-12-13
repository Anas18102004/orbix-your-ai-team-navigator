import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDB } from './db/connection';
import { setupSocketIO } from './websocket/socket';

// Routes
import authRoutes from './routes/auth';
import organizationRoutes from './routes/organizations';
import workspaceRoutes from './routes/workspaces';
import inviteRoutes from './routes/invites';
import channelRoutes from './routes/channels';
import messageRoutes from './routes/messages';
import taskRoutes from './routes/tasks';
import notificationRoutes from './routes/notifications';
import dmRoutes from './routes/dms';
import updateRoutes from './routes/updates';
import chatRoutes from './routes/chats';
import meetingRoutes from './routes/meetings';
import aiContextRoutes from './routes/aiContext';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Import routes
import membersRoutes from './routes/members';

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/workspaces', channelRoutes);
app.use('/api/workspaces', messageRoutes);
app.use('/api/workspaces', taskRoutes);
app.use('/api/workspaces', membersRoutes); // Member management routes
app.use('/api/workspaces', updateRoutes); // Project updates routes
app.use('/api/workspaces', meetingRoutes); // Meeting routes (feature-flagged)
app.use('/api', meetingRoutes); // Meeting routes (for /api/meetings/:id)
app.use('/api', aiContextRoutes); // AI Context docs routes
app.use('/api/dms', dmRoutes); // Direct messages routes
app.use('/api/chats', chatRoutes); // New chat creation routes
app.use('/api/notifications', notificationRoutes);

// Setup Socket.IO
setupSocketIO(httpServer);

const PORT = process.env.PORT || 3000;

// Start server
const startServer = async () => {
  try {
    await connectDB();

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 WebSocket server ready`);

      // Initialize SFU service asynchronously after server starts
      if (process.env.FEATURE_MEETINGS === 'true') {
        console.log(`🎥 Meetings feature enabled, initializing SFU...`);
        import('./services/meetings/sfu').then(async ({ getSFUService }) => {
          try {
            await getSFUService();
            console.log('✅ SFU service initialized');

            // Schedule recordings purge job
            try {
              const { schedulePurgeJob } = await import('./jobs/recordingsPurgeJob');
              schedulePurgeJob();
            } catch (error: any) {
              console.warn('⚠️  Failed to schedule purge job:', error.message);
            }
          } catch (error: any) {
            console.warn('⚠️  SFU service initialization failed:', error.message);
            console.warn('   Meetings feature may not work correctly. Ensure valid Mediasoup setup.');
          }
        }).catch(err => console.error('Failed to import SFU service:', err));
      }
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

