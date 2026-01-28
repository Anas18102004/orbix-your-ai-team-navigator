/**
 * Meeting Provider Interface
 * 
 * VIDEO_PROVIDER_HOOK: This abstraction allows plugging in different video meeting providers
 * (Zoom, Google Meet, etc.) without modifying core meeting logic.
 * 
 * Design Principles:
 * - Provider-agnostic: Easy to add new providers
 * - Graceful degradation: System works without any provider configured
 * - Never blocks core meeting functionality
 */

import { MeetingProvider } from '../../../models/Meeting';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateMeetingParams {
    title: string;
    description?: string;
    agenda?: string;
    startTime?: Date;
    endTime?: Date;
    timezone?: string;
    organizerEmail: string;
    participantEmails?: string[];
}

export interface UpdateMeetingParams {
    title?: string;
    description?: string;
    startTime?: Date;
    endTime?: Date;
}

export interface ProviderMeetingResult {
    provider: MeetingProvider;
    externalId: string;
    joinUrl: string;
    hostUrl?: string;
    password?: string;
}

export interface ProviderStatus {
    name: MeetingProvider;
    configured: boolean;
    error?: string;
}

// ============================================================================
// INTERFACE
// ============================================================================

export interface IMeetingProvider {
    /**
     * Provider name identifier
     */
    readonly name: MeetingProvider;

    /**
     * Check if this provider is properly configured
     * Returns true if all required credentials/config are present
     */
    isConfigured(): boolean;

    /**
     * Get provider status with configuration details
     */
    getStatus(): ProviderStatus;

    /**
     * Create a meeting in the external provider
     * @throws Error if provider not configured or API fails
     */
    createMeeting(params: CreateMeetingParams): Promise<ProviderMeetingResult>;

    /**
     * Update an existing meeting in the external provider
     * @throws Error if provider not configured or API fails
     */
    updateMeeting(externalId: string, params: UpdateMeetingParams): Promise<ProviderMeetingResult>;

    /**
     * Cancel/delete a meeting in the external provider
     * Should fail silently if meeting doesn't exist
     */
    cancelMeeting(externalId: string): Promise<void>;
}

// ============================================================================
// PROVIDER REGISTRY
// ============================================================================

/**
 * Registry of all available meeting providers
 * VIDEO_PROVIDER_HOOK: Add new providers here
 */
class MeetingProviderRegistry {
    private providers: Map<MeetingProvider, IMeetingProvider> = new Map();

    register(provider: IMeetingProvider): void {
        this.providers.set(provider.name, provider);
        console.log(`[MeetingProviderRegistry] Registered provider: ${provider.name}`);
    }

    get(name: MeetingProvider): IMeetingProvider | undefined {
        return this.providers.get(name);
    }

    getAll(): IMeetingProvider[] {
        return Array.from(this.providers.values());
    }

    getConfigured(): IMeetingProvider[] {
        return this.getAll().filter(p => p.isConfigured());
    }

    getStatus(): ProviderStatus[] {
        return this.getAll().map(p => p.getStatus());
    }
}

// Singleton registry instance
export const providerRegistry = new MeetingProviderRegistry();
