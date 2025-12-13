/**
 * SFU Abstraction Types
 * 
 * Defines interfaces for SFU providers (mediasoup, managed providers)
 * to allow easy switching between implementations.
 */

export interface RouterRtpCapabilities {
  codecs?: any[];
  headerExtensions?: any[];
}

export interface TransportOptions {
  routerId: string;
  direction: 'send' | 'recv';
  clientId: string;
}

export interface Transport {
  id: string;
  iceParameters: any;
  iceCandidates: any[];
  dtlsParameters: any;
}

export interface ProduceOptions {
  transportId: string;
  kind: 'audio' | 'video';
  rtpParameters: any;
  appData?: any;
}

export interface Producer {
  id: string;
  kind: 'audio' | 'video';
  rtpParameters: any;
  appData?: any;
}

export interface ConsumeOptions {
  consumerTransportId: string;
  producerId: string;
  rtpCapabilities: RouterRtpCapabilities;
}

export interface Consumer {
  id: string;
  kind: 'audio' | 'video';
  rtpParameters: any;
}

export interface RecordingOptions {
  routerId: string;
  tracks: Array<{ id: string; kind: 'audio' | 'video'; rtpParameters: any }>;
  outputPath: string;
}

export interface Recording {
  id: string;
  status: 'recording' | 'stopped' | 'failed';
}

export interface TURNCredentials {
  urls: string[];
  username: string;
  credential: string;
}

export interface JoinResponse {
  joinMode: 'sfu' | 'managed';
  routerRtpCapabilities?: RouterRtpCapabilities;
  createTransportToken?: string;
  turn?: TURNCredentials;
  providerJoinUrl?: string;
  providerToken?: string;
  meeting: {
    meetingId: string;
    status: string;
    participants: any[];
  };
}

export interface ISFUService {
  initWorkerPool(): Promise<void>;
  getOrCreateRouter(roomId: string): Promise<string>;
  createTransport(options: TransportOptions): Promise<Transport>;
  handleProduce(options: ProduceOptions): Promise<Producer>;
  handleConsume(options: ConsumeOptions): Promise<Consumer>;
  startRecording(options: RecordingOptions): Promise<Recording>;
  stopRecording(recordingId: string): Promise<void>;
  getTURNCredentials(): TURNCredentials;
  generateJoinToken(meetingId: string, userId: string, expiresIn?: number): string;
  getRouterRtpCapabilities(routerId: string): RouterRtpCapabilities;
  connectTransport(transportId: string, dtlsParameters: any): Promise<void>;
  cleanupPeer(meetingId: string, userId: string): Promise<void>;
  getProducers(meetingId: string): Producer[];
  resumeConsumer(consumerId: string): Promise<void>;
}
