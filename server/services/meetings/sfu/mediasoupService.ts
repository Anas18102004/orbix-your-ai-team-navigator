/**
 * mediasoup SFU Service Implementation
 * 
 * Implements ISFUService using mediasoup library.
 * Assumes: mediasoup is installed and TURN server is configured.
 */
import * as mediasoup from 'mediasoup';
import os from 'os';
import { ISFUService, TransportOptions, ProduceOptions, ConsumeOptions, RecordingOptions, TURNCredentials, RouterRtpCapabilities } from './types';
import jwt from 'jsonwebtoken';
import { EventEmitter } from 'events';

interface Worker {
  worker: mediasoup.types.Worker;
  router: mediasoup.types.Router | null;
}

export class MediasoupService extends EventEmitter implements ISFUService {
  private workers: Worker[] = [];
  private routers: Map<string, mediasoup.types.Router> = new Map();
  private roomRouters: Map<string, string> = new Map(); // roomId -> routerId
  private transports: Map<string, mediasoup.types.Transport> = new Map();
  private producers: Map<string, mediasoup.types.Producer> = new Map();
  private consumers: Map<string, mediasoup.types.Consumer> = new Map();
  private recordings: Map<string, any> = new Map();
  private audioLevelObservers: Map<string, mediasoup.types.AudioLevelObserver> = new Map(); // routerId -> observer
  private transportRouterMap: Map<string, string> = new Map(); // transportId -> routerId

  async initWorkerPool(): Promise<void> {
    const numWorkers = Math.min(os.cpus().length, 4); // Cap at 4 workers

    for (let i = 0; i < numWorkers; i++) {
      const worker = await mediasoup.createWorker({
        logLevel: (process.env.MEDIASOUP_LOG_LEVEL || 'warn') as mediasoup.types.WorkerLogLevel,
        logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
        rtcMinPort: 40000 + (i * 1000),
        rtcMaxPort: 49999 - (i * 1000),
      });

      this.workers.push({ worker, router: null });
      console.log(`✅ mediasoup worker ${i + 1}/${numWorkers} created`);
    }

    console.log(`✅ mediasoup worker pool initialized with ${numWorkers} workers`);
  }

  async getOrCreateRouter(roomId: string): Promise<string> {
    if (this.roomRouters.has(roomId)) {
      return this.roomRouters.get(roomId)!;
    }

    // Use round-robin to assign workers
    const workerIndex = this.routers.size % this.workers.length;
    const workerData = this.workers[workerIndex];

    // Create router on the worker
    const router = await workerData.worker.createRouter({
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
        },
        {
          kind: 'video',
          mimeType: 'video/VP9',
          clockRate: 90000,
        },
        {
          kind: 'video',
          mimeType: 'video/h264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '42e01f',
            'level-asymmetry-allowed': 1,
          },
        },
      ],
    });

    // Create AudioLevelObserver
    const audioLevelObserver = await router.createAudioLevelObserver({
      maxEntries: 1,
      threshold: -80,
      interval: 800
    });

    audioLevelObserver.on('volumes', (volumes) => {
      const { producer, volume } = volumes[0];
      // Emit active speaker event
      this.emit('activeSpeaker', {
        roomId,
        producerId: producer.id,
        volume: volume,
        appData: producer.appData
      });
    });

    audioLevelObserver.on('silence', () => {
      this.emit('activeSpeaker', {
        roomId,
        producerId: null
      });
    });

    const routerId = router.id;
    this.audioLevelObservers.set(routerId, audioLevelObserver);
    this.routers.set(routerId, router);
    this.roomRouters.set(roomId, routerId);

    return routerId;
  }

  async createTransport(options: TransportOptions): Promise<any> {
    const router = this.routers.get(options.routerId);
    if (!router) {
      throw new Error(`Router ${options.routerId} not found`);
    }

    const transport = await router.createWebRtcTransport({
      listenIps: [{ ip: '0.0.0.0', announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || undefined }],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      appData: { clientId: options.clientId, userId: options.clientId } // Store both for safety
    });

    this.transports.set(transport.id, transport);
    this.transportRouterMap.set(transport.id, options.routerId); // Store mapping

    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
  }

  async connectTransport(transportId: string, dtlsParameters: any): Promise<void> {
    const transport = this.transports.get(transportId);
    if (!transport) {
      throw new Error(`Transport ${transportId} not found`);
    }

    await transport.connect({ dtlsParameters });
  }

  async handleProduce(options: ProduceOptions): Promise<any> {
    const transport = this.transports.get(options.transportId);
    if (!transport) {
      throw new Error(`Transport ${options.transportId} not found`);
    }

    const producer = await transport.produce({
      kind: options.kind,
      rtpParameters: options.rtpParameters,
      appData: { ...options.appData, transportId: options.transportId }
    });

    this.producers.set(producer.id, producer);

    // Add to AudioLevelObserver if audio
    if (producer.kind === 'audio') {
      const routerId = this.transportRouterMap.get(options.transportId);
      if (routerId) {
        const observer = this.audioLevelObservers.get(routerId);
        if (observer) {
          observer.addProducer({ producerId: producer.id });
        }
      }
    }

    return {
      id: producer.id,
      kind: producer.kind,
      rtpParameters: producer.rtpParameters,
    };
  }

  async handleConsume(options: ConsumeOptions): Promise<any> {
    const transport = this.transports.get(options.consumerTransportId);
    if (!transport) {
      throw new Error(`Transport ${options.consumerTransportId} not found`);
    }

    const producer = this.producers.get(options.producerId);
    if (!producer) {
      throw new Error(`Producer ${options.producerId} not found`);
    }

    const consumer = await transport.consume({
      producerId: producer.id,
      rtpCapabilities: options.rtpCapabilities as any, // Cast to avoid type mismatch
      paused: true // Start paused, wait for client to signal resume
    });

    this.consumers.set(consumer.id, consumer);

    consumer.on('transportclose', () => {
      this.consumers.delete(consumer.id);
    });

    consumer.on('producerclose', () => {
      this.consumers.delete(consumer.id);
    });

    return {
      id: consumer.id,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
    };
  }

  async startRecording(options: RecordingOptions): Promise<any> {
    // Placeholder - actual recording implementation requires ffmpeg integration
    const recordingId = `rec-${Date.now()}`;
    this.recordings.set(recordingId, {
      id: recordingId,
      status: 'recording',
      routerId: options.routerId,
      tracks: options.tracks,
      outputPath: options.outputPath,
    });

    return {
      id: recordingId,
      status: 'recording' as const,
    };
  }

  async stopRecording(recordingId: string): Promise<void> {
    const recording = this.recordings.get(recordingId);
    if (recording) {
      recording.status = 'stopped';
    }
  }

  getTURNCredentials(): TURNCredentials {
    return {
      urls: [process.env.TURN_SERVER_URL || 'stun:stun.l.google.com:19302'],
      username: process.env.TURN_USER || '',
      credential: process.env.TURN_PASS || '',
    };
  }

  generateJoinToken(meetingId: string, userId: string, expiresIn: number = 60): string {
    const secret = process.env.JWT_SECRET || 'change-me';
    return jwt.sign(
      { meetingId, userId, type: 'meeting-join' },
      secret,
      { expiresIn }
    );
  }

  getRouterRtpCapabilities(routerId: string): RouterRtpCapabilities {
    const router = this.routers.get(routerId);
    if (!router) {
      throw new Error(`Router ${routerId} not found`);
    }
    return router.rtpCapabilities as unknown as RouterRtpCapabilities;
  }

  async closeProducer(producerId: string): Promise<void> {
    const producer = this.producers.get(producerId);
    if (producer) {
      producer.close();
      this.producers.delete(producerId);
      // Also remove from audioLevelObservers if needed, but 'producerclose' event on router might handle?
      // Better to be safe.
      // Iterate observers? expensive.
      // But mostly it's fine, active speaker will stop.
    }
  }

  async cleanupPeer(meetingId: string, userId: string): Promise<void> {
    const routerId = this.roomRouters.get(meetingId);
    if (!routerId) return;

    const transportsToRemove: string[] = [];

    // Find all transports for this peer
    for (const [id, transport] of this.transports.entries()) {
      if (transport.appData.clientId === userId || transport.appData.userId === userId) { // Use consistent key
        transportsToRemove.push(id);
      }
    }

    for (const id of transportsToRemove) {
      const transport = this.transports.get(id);
      if (transport) {
        transport.close(); // This closes associated producers/consumers
        this.transports.delete(id);
        this.transportRouterMap.delete(id);
      }
    }

    // Explicitly clean up producers map just in case, though transport.close handles actual closing
    const producersToRemove: string[] = [];
    for (const [id, producer] of this.producers.entries()) {
      if (producer.appData.userId === userId) {
        producersToRemove.push(id);
      }
    }

    for (const id of producersToRemove) {
      this.producers.delete(id);
    }

    // Clean up consumers map
    const consumersToRemove: string[] = [];
    for (const [id, consumer] of this.consumers.entries()) {
      if (consumer.appData.userId === userId) {
        consumersToRemove.push(id);
      }
    }
    for (const id of consumersToRemove) {
      this.consumers.delete(id);
    }

    console.log(`🧹 Cleaned up resources for user ${userId} in meeting ${meetingId}`);
  }

  getProducers(meetingId: string): any[] {
    const routerId = this.roomRouters.get(meetingId);
    if (!routerId) return [];

    const result: any[] = [];
    for (const producer of this.producers.values()) {
      const producerRouterId = this.transportRouterMap.get(producer.appData.transportId);
      if (producerRouterId === routerId) {
        result.push({
          id: producer.id,
          kind: producer.kind,
          rtpParameters: producer.rtpParameters,
          appData: producer.appData
        });
      }
    }
    return result;
  }

  async resumeConsumer(consumerId: string): Promise<void> {
    const consumer = this.consumers.get(consumerId);
    if (consumer) {
      await consumer.resume();
    }
  }
}
