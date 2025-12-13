/**
 * SFU Service Factory
 * 
 * Returns the appropriate SFU service based on MEETINGS_SFU env var.
 * Default: mediasoup
 */
import type { ISFUService } from './types';
import { MediasoupService } from './mediasoupService';

let sfuService: ISFUService | null = null;

export async function getSFUService(): Promise<ISFUService> {
  if (sfuService) {
    return sfuService;
  }

  const sfuType = process.env.MEETINGS_SFU || 'mediasoup';

  if (sfuType === 'mediasoup') {
    sfuService = new MediasoupService();
    await sfuService.initWorkerPool();
  } else if (sfuType === 'managed') {
    // TODO: Implement managed provider service (Daily.co, Agora, etc.)
    throw new Error('Managed SFU providers not yet implemented. Set MEETINGS_SFU=mediasoup');
  } else {
    throw new Error(`Unknown SFU type: ${sfuType}`);
  }

  return sfuService;
}

export type { ISFUService } from './types';
