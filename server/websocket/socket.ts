import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Message } from '../models/Message';
import { Channel } from '../models/Channel';
import { Task } from '../models/Task';
import { Notification } from '../models/Notification';
import { WorkspaceMembership } from '../models/WorkspaceMembership';
import { Invite } from '../models/Invite';
import { Meeting } from '../models/Meeting';
import mongoose from 'mongoose';
import { getSFUService } from '../services/meetings/sfu';
import { MeetingManager } from '../services/meetings/MeetingManager';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export const setupSocketIO = (httpServer: HTTPServer) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:8080',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const user = await User.findById(decoded.userId).select('-passwordHash');

      if (!user) {
        return next(new Error('User not found'));
      }

      (socket as any).userId = user._id.toString();
      (socket as any).user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const userId = (socket as any).userId;
    console.log(`User ${userId} connected`);

    // Meeting namespace handlers (feature-flagged)
    if (process.env.FEATURE_MEETINGS === 'true') {
      setupMeetingHandlers(io, socket, userId);
    }

    // Join user-specific room for notifications
    socket.join(`user:${userId}`);

    // Handle workspace join
    socket.on('workspace:join', (workspaceId: string) => {
      socket.join(`workspace:${workspaceId}`);
      console.log(`User ${userId} joined workspace ${workspaceId}`);
    });

    // Handle workspace leave
    socket.on('workspace:leave', (workspaceId: string) => {
      socket.leave(`workspace:${workspaceId}`);
      console.log(`User ${userId} left workspace ${workspaceId}`);
    });

    // Handle channel join
    socket.on('channel:join', (data: { workspaceId: string; channelId: string }) => {
      socket.join(`workspace:${data.workspaceId}:channel:${data.channelId}`);
      console.log(`User ${userId} joined channel ${data.channelId} in workspace ${data.workspaceId}`);
    });

    // Handle channel leave
    socket.on('channel:leave', (data: { workspaceId: string; channelId: string }) => {
      socket.leave(`workspace:${data.workspaceId}:channel:${data.channelId}`);
      console.log(`User ${userId} left channel ${data.channelId} in workspace ${data.workspaceId}`);
    });

    // Meeting namespace handlers (feature-flagged)
    if (process.env.FEATURE_MEETINGS === 'true') {
      setupMeetingHandlers(io, socket, userId);
    }

    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected`);

      // Meeting cleanup
      if (process.env.FEATURE_MEETINGS === 'true') {
        const info = MeetingManager.getInstance().getParticipantBySocketId(socket.id);
        if (info) {
          MeetingManager.getInstance().removeParticipant(info.meetingId, info.participant.userId);

          // SFU Cleanup (Async)
          getSFUService().then(sfu => {
            sfu.cleanupPeer(info.meetingId, info.participant.userId).catch(err => console.error('SFU cleanup error:', err));
          });

          io.to(`meeting:${info.meetingId}`).emit('meeting:participant-left', {
            userId: info.participant.userId,
            meetingId: info.meetingId
          });
        }
      }
    });
  });

  // Setup MongoDB change streams
  setupChangeStreams(io);

  // Setup SFU Listeners (for Active Speaker)
  initializeSFUListeners(io);

  return io;
};

async function initializeSFUListeners(io: SocketIOServer) {
  try {
    const sfuService = (await getSFUService()) as any; // Cast to access 'on' if interface doesn't expose it (it doesn't, MediasoupService extends EventEmitter)
    // Wait, ISFUService doesn't have 'on'. I should cast to MediasoupService or update interface? 
    // Casting is quick fix.

    if (sfuService.on) {
      sfuService.on('activeSpeaker', (data: { roomId: string; producerId: string; volume: number; appData: any }) => {
        const { roomId, producerId, volume, appData } = data;
        io.to(`meeting:${roomId}`).emit('meeting:active-speaker', {
          producerId,
          volume,
          userId: appData?.userId
        });
      });
    }
  } catch (error) {
    console.error('Failed to initialize SFU listeners:', error);
  }
}

const setupChangeStreams = (io: SocketIOServer) => {
  try {
    // Messages change stream
    const messageStream = Message.watch([], { fullDocument: 'updateLookup' });

    messageStream.on('change', async (change) => {
      if (change.operationType === 'insert') {
        const message = change.fullDocument;
        if (message) {
          const workspaceId = message.workspaceId.toString();
          const channelId = message.channelId.toString();

          // Populate sender data
          const populatedMessage = await Message.findById(message._id)
            .populate('senderId', 'name email')
            .lean();

          if (populatedMessage) {
            const sender = populatedMessage.senderId as any;
            io.to(`workspace:${workspaceId}:channel:${channelId}`).emit('message:new', {
              message: {
                _id: populatedMessage._id,
                workspaceId: populatedMessage.workspaceId,
                channelId: populatedMessage.channelId,
                sender: {
                  _id: sender._id,
                  name: sender.name,
                  email: sender.email,
                },
                content: populatedMessage.content,
                attachments: populatedMessage.attachments || [],
                createdAt: populatedMessage.createdAt,
              },
            });
          }
        }
      }
    });

    messageStream.on('error', (error: any) => {
      if (error.code === 40573) {
        console.warn('⚠️  MongoDB change streams require a replica set. Realtime updates disabled.');
        console.warn('   To enable realtime features, set up a MongoDB replica set.');
        console.warn('   See README_BACKEND.md for instructions.');
      } else {
        console.error('❌ Change stream error:', error);
      }
    });

    // Tasks change stream
    const taskStream = Task.watch([], { fullDocument: 'updateLookup' });

    taskStream.on('change', async (change) => {
      const task = change.fullDocument;
      if (!task) return;

      const workspaceId = task.workspaceId.toString();

      if (change.operationType === 'insert') {
        io.to(`workspace:${workspaceId}`).emit('task:created', {
          task: {
            _id: task._id,
            workspaceId: task.workspaceId,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            assigneeId: task.assigneeId,
            creatorId: task.creatorId,
            relatedMessageId: task.relatedMessageId,
            dueDate: task.dueDate,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
          },
        });
      } else if (change.operationType === 'update') {
        io.to(`workspace:${workspaceId}`).emit('task:updated', {
          task: {
            _id: task._id,
            workspaceId: task.workspaceId,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            assigneeId: task.assigneeId,
            creatorId: task.creatorId,
            relatedMessageId: task.relatedMessageId,
            dueDate: task.dueDate,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
          },
        });
      }
    });

    taskStream.on('error', (error: any) => {
      if (error.code !== 40573) {
        console.error('❌ Task change stream error:', error);
      }
    });

    // Notifications change stream
    const notificationStream = Notification.watch([], { fullDocument: 'updateLookup' });

    notificationStream.on('change', async (change) => {
      if (change.operationType === 'insert') {
        const notification = change.fullDocument;
        if (notification) {
          const userId = notification.userId.toString();

          io.to(`user:${userId}`).emit('notification:new', {
            notification: {
              _id: notification._id,
              userId: notification.userId,
              workspaceId: notification.workspaceId,
              type: notification.type,
              entityId: notification.entityId,
              message: notification.message,
              read: notification.read,
              createdAt: notification.createdAt,
            },
          });
        }
      }
    });

    notificationStream.on('error', (error: any) => {
      if (error.code !== 40573) {
        console.error('❌ Notification change stream error:', error);
      }
    });

    // Workspace memberships change stream (for workspace list updates)
    const membershipStream = WorkspaceMembership.watch([], { fullDocument: 'updateLookup' });

    membershipStream.on('change', async (change) => {
      if (change.operationType === 'insert' || change.operationType === 'delete') {
        const membership = change.fullDocument || change.documentKey;
        if (membership) {
          const userId = (membership.userId || change.documentKey?.userId)?.toString();
          const workspaceId = (membership.workspaceId || change.documentKey?.workspaceId)?.toString();

          if (userId) {
            io.to(`user:${userId}`).emit('workspace:membership:changed', {
              action: change.operationType,
              membership,
            });
          }

          if (workspaceId) {
            io.to(`workspace:${workspaceId}`).emit('workspace:membership:changed', {
              action: change.operationType,
              membership,
            });
          }
        }
      }
    });

    membershipStream.on('error', (error: any) => {
      if (error.code !== 40573) {
        console.error('❌ Membership change stream error:', error);
      }
    });

    // Invites change stream (for real-time invite updates)
    try {
      const inviteStream = Invite.watch([], { fullDocument: 'updateLookup' });

      inviteStream.on('change', async (change: any) => {
        if (change.operationType === 'insert') {
          const invite = change.fullDocument;
          if (invite) {
            const workspaceId = invite.workspaceId.toString();
            // Notify all workspace members about new invite
            io.to(`workspace:${workspaceId}`).emit('invite:new', {
              invite: {
                _id: invite._id,
                code: invite.code,
                workspaceId: invite.workspaceId,
                createdBy: invite.createdBy,
                createdAt: invite.createdAt,
              },
            });
          }
        }
      });

      inviteStream.on('error', (error: any) => {
        if (error.code !== 40573) {
          console.error('❌ Invite change stream error:', error);
        }
      });
    } catch (error: any) {
      if (error.code !== 40573) {
        console.error('❌ Failed to initialize invite change stream:', error);
      }
    }

    // Channels change stream (for real-time channel updates)
    try {
      const channelStream = Channel.watch([], { fullDocument: 'updateLookup' });

      channelStream.on('change', async (change: any) => {
        if (change.operationType === 'insert') {
          const channel = change.fullDocument;
          if (channel) {
            const workspaceId = channel.workspaceId.toString();
            // Notify all workspace members about new channel
            io.to(`workspace:${workspaceId}`).emit('channel:new', {
              channel: {
                _id: channel._id,
                workspaceId: channel.workspaceId,
                name: channel.name,
                type: channel.type,
                memberIds: channel.memberIds,
                aiMode: channel.aiMode,
                createdAt: channel.createdAt,
              },
            });
          }
        }
      });

      channelStream.on('error', (error: any) => {
        if (error.code !== 40573) {
          console.error('❌ Channel change stream error:', error);
        }
      });
    } catch (error: any) {
      if (error.code !== 40573) {
        console.error('❌ Failed to initialize channel change stream:', error);
      }
    }

    console.log('✅ MongoDB change streams initialized');
  } catch (error: any) {
    if (error.code === 40573) {
      console.warn('⚠️  MongoDB change streams require a replica set. Realtime updates disabled.');
      console.warn('   To enable realtime features, set up a MongoDB replica set.');
      console.warn('   See README_BACKEND.md for instructions.');
    } else {
      console.error('❌ Failed to initialize change streams:', error);
    }
  }
};

// Meeting WebSocket handlers
async function setupMeetingHandlers(io: SocketIOServer, socket: any, userId: string) {
  const sfuService = await getSFUService();

  // Join meeting room (Presence)
  // ---------------------------------------------------------
  socket.on('meeting:join', async (meetingId: string) => {
    try {
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        socket.emit('meeting:error', { message: 'Meeting not found' });
        return;
      }

      // Verify user is participant
      const isParticipant = meeting.participants.some(
        (p) => p.userId.toString() === userId
      );

      if (!isParticipant) {
        socket.emit('meeting:error', { message: 'Not a participant in this meeting' });
        return;
      }

      // Determine Role (simplified)
      // In real app, fetch WorkspaceMembership. Here we assume 'crew' unless explicit org admin or omni logic known
      // We can check if organizer
      let role = 'crew';
      if (meeting.organizerId.toString() === userId) {
        role = 'omni'; // Organizer gets omni privileges effectively
      }

      // Add to MeetingManager
      const participantState = {
        userId,
        socketId: socket.id,
        name: (socket as any).user.name,
        role: role as any,
        joinedAt: new Date(),
        micOn: false,
        cameraOn: false,
        screenSharing: false,
        handRaised: false
      };

      MeetingManager.getInstance().addParticipant(meetingId, participantState);

      socket.join(`meeting:${meetingId}`);

      // Notify others about presence with FULL state
      socket.to(`meeting:${meetingId}`).emit('meeting:participant-joined', {
        participant: participantState
      });

      // Sync list to self (Immediate State)
      const allParticipants = MeetingManager.getInstance().getParticipants(meetingId);
      socket.emit('meeting:sync-participants', { participants: allParticipants });

    } catch (error) {
      console.error('Meeting join error', error);
      socket.emit('meeting:error', { message: 'Failed to join meeting' });
    }
  });

  // Handle State Updates (Mic/Cam/Screen)
  socket.on('meeting:update-state', (data: { meetingId: string, state: any }) => {
    const updated = MeetingManager.getInstance().updateParticipantState(data.meetingId, userId, data.state);
    if (updated) {
      // Broadcast only the specific update to save bandwidth?? Or full object?
      // Sending full updated object is safer for consistency
      socket.to(`meeting:${data.meetingId}`).emit('meeting:participant-updated', {
        userId,
        state: updated
      });
    }
  });

  // Handle Chat
  socket.on('meeting:chat-message', (data: { meetingId: string, text: string }) => {
    const message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      senderId: userId,
      senderName: (socket as any).user.name,
      text: data.text,
      timestamp: new Date()
    };
    io.to(`meeting:${data.meetingId}`).emit('meeting:chat-message', message);
  });

  // Leave meeting room
  socket.on('meeting:leave', async (meetingId: string) => {
    MeetingManager.getInstance().removeParticipant(meetingId, userId);

    // SFU Cleanup
    try {
      await sfuService.cleanupPeer(meetingId, userId);
    } catch (err) {
      console.error('SFU cleanup error on leave:', err);
    }

    socket.leave(`meeting:${meetingId}`);
    socket.to(`meeting:${meetingId}`).emit('meeting:participant-left', {
      userId,
      meetingId,
    });
  });

  // --- Mediasoup Signaling ---

  // Get Transports & Router
  socket.on('meeting:get-transports', async (data: { meetingId: string }, callback) => {
    try {
      const { meetingId } = data;
      // Ensure router exists for this meeting
      const routerId = await sfuService.getOrCreateRouter(meetingId);

      // Create Send Transport
      const sendTransport = await sfuService.createTransport({
        routerId,
        direction: 'send',
        clientId: userId,
      });

      // Create Recv Transport
      const recvTransport = await sfuService.createTransport({
        routerId,
        direction: 'recv',
        clientId: userId,
      });

      if (callback) {
        callback({
          sendTransportOptions: {
            id: sendTransport.id,
            iceParameters: sendTransport.iceParameters,
            iceCandidates: sendTransport.iceCandidates,
            dtlsParameters: sendTransport.dtlsParameters
          },
          recvTransportOptions: {
            id: recvTransport.id,
            iceParameters: recvTransport.iceParameters,
            iceCandidates: recvTransport.iceCandidates,
            dtlsParameters: recvTransport.dtlsParameters
          },
          routerRtpCapabilities: sfuService.getRouterRtpCapabilities(routerId)
        });
      }
    } catch (error: any) {
      console.error('get-transports error:', error);
      if (callback) callback({ error: error.message });
    }
  });

  // Get Existing Producers
  socket.on('meeting:get-producers', (data: { meetingId: string }, callback) => {
    try {
      const producers = sfuService.getProducers(data.meetingId);
      if (callback) {
        callback(producers); // Send back list
      } else {
        // Fallback if client doesn't use callback (legacy emit?)
        // Not strictly needed if we update client to use callback
        socket.emit('meeting:existing-producers', producers);
      }
    } catch (error: any) {
      console.error('get-producers error:', error);
    }
  });

  // Connect Transport
  socket.on('meeting:connect-transport', async (data: { meetingId: string; transportId: string; dtlsParameters: any }, callback) => {
    try {
      await sfuService.connectTransport(data.transportId, data.dtlsParameters);
      if (callback) callback({});
    } catch (error: any) {
      console.error('connect-transport error:', error);
      if (callback) callback({ error: error.message });
    }
  });

  // Produce
  socket.on('meeting:produce', async (data: { meetingId: string; transportId: string; kind: 'audio' | 'video'; rtpParameters: any; appData: any }, callback) => {
    try {
      const producer = await sfuService.handleProduce({
        transportId: data.transportId,
        kind: data.kind,
        rtpParameters: data.rtpParameters,
        appData: { ...data.appData, userId } // Inject userId
      });

      // Notify others in the meeting
      socket.to(`meeting:${data.meetingId}`).emit('meeting:new-producer', {
        producerId: producer.id,
        participantId: userId, // associate producer with user
        kind: producer.kind
      });

      if (callback) callback({ id: producer.id });
    } catch (error: any) {
      console.error('produce error:', error);
      if (callback) callback({ error: error.message });
    }
  });

  // Consume
  socket.on('meeting:consume', async (data: { meetingId: string; producerId: string; rtpCapabilities: any; transportId: string }, callback) => {
    try {
      const consumer = await sfuService.handleConsume({
        consumerTransportId: data.transportId, // client must send this
        producerId: data.producerId,
        rtpCapabilities: data.rtpCapabilities
      });

      if (callback) {
        callback({
          id: consumer.id,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters
        });
      }
    } catch (error: any) {
      console.error('consume error:', error);
      if (callback) callback({ error: error.message });
    }
  });

  // Close Producer
  socket.on('meeting:close-producer', async (data: { meetingId: string; producerId: string }) => {
    try {
      // We need a way to close specific producer in SFU service.
      // Currently ISFUService doesn't expose 'closeProducer'.
      // But we can implement it or access internal map if needed.
      // For mediasoupService, we can add closeProducer.
      // For now, if we assume MediasoupService is used:
      const sfu = sfuService as any;
      if (sfu.closeProducer) {
        await sfu.closeProducer(data.producerId);
      }

      // Notify others
      socket.to(`meeting:${data.meetingId}`).emit('meeting:consumer-closed', {
        producerId: data.producerId // Consumers matching this producer should close
      });

    } catch (error) {
      console.error('close-producer error:', error);
    }
  });

  // Resume Consumer
  socket.on('meeting:resume-consumer', async (data: { meetingId: string; consumerId: string }) => {
    try {
      await sfuService.resumeConsumer(data.consumerId);
    } catch (error) {
      console.error('resume-consumer error:', error);
    }
  });
}

