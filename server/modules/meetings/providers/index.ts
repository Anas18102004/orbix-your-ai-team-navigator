/**
 * Meeting Providers - Main Entry Point
 * 
 * VIDEO_PROVIDER_HOOK: This module exports all available meeting providers
 * and initializes the provider registry.
 * 
 * To add a new provider:
 * 1. Create newProvider.provider.ts implementing IMeetingProvider
 * 2. Import and register it here
 * 3. Add to MeetingProvider type in Meeting.ts
 */

import { providerRegistry } from './meetingProvider.interface';
import { internalProvider } from './internal.provider';
import { zoomProvider } from './zoom.provider';
import { googleMeetProvider } from './googleMeet.provider';

// Register all providers
providerRegistry.register(internalProvider);
providerRegistry.register(zoomProvider);
providerRegistry.register(googleMeetProvider);

// Export everything
export * from './meetingProvider.interface';
export { internalProvider } from './internal.provider';
export { zoomProvider } from './zoom.provider';
export { googleMeetProvider } from './googleMeet.provider';

/**
 * Get a provider by name
 */
export function getMeetingProvider(name: 'zoom' | 'google_meet' | 'internal' | null) {
    if (!name) return null;
    return providerRegistry.get(name);
}

/**
 * Get all configured (ready to use) providers
 */
export function getConfiguredProviders() {
    return providerRegistry.getConfigured();
}

/**
 * Get status of all providers
 */
export function getProvidersStatus() {
    return providerRegistry.getStatus();
}

/**
 * Check if any external provider is configured
 */
export function hasExternalProvider(): boolean {
    return providerRegistry.getConfigured().some(p => p.name !== 'internal');
}

console.log('[MeetingProviders] Initialized. Status:',
    providerRegistry.getStatus().map(s => `${s.name}:${s.configured}`).join(', ')
);
