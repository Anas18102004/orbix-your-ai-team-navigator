/**
 * Internal Meeting Provider
 * 
 * This provider represents the built-in SFU-based video meeting system.
 * It's the default when no external provider is configured.
 * 
 * Unlike Zoom/Google Meet, this doesn't create external meetings -
 * it just returns URLs pointing to the internal meeting room.
 */

import {
    IMeetingProvider,
    CreateMeetingParams,
    UpdateMeetingParams,
    ProviderMeetingResult,
    ProviderStatus,
} from './meetingProvider.interface';
import { MeetingProvider } from '../../../models/Meeting';

export class InternalMeetingProvider implements IMeetingProvider {
    readonly name: MeetingProvider = 'internal';

    /**
     * Internal provider is always "configured" since it's built-in
     */
    isConfigured(): boolean {
        return true;
    }

    getStatus(): ProviderStatus {
        return {
            name: 'internal',
            configured: true,
        };
    }

    /**
     * For internal meetings, we generate URLs pointing to our meeting room
     */
    async createMeeting(params: CreateMeetingParams): Promise<ProviderMeetingResult> {
        // The meeting ID will be set by the caller after the Meeting document is created
        // This is a placeholder that returns a template URL
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        // We'll use a placeholder - the actual ID gets filled in by the route
        return {
            provider: 'internal',
            externalId: 'internal',  // Will be replaced with actual meeting._id
            joinUrl: `${baseUrl}/meeting/{{meetingId}}`,
            hostUrl: `${baseUrl}/meeting/{{meetingId}}?host=true`,
        };
    }

    /**
     * Internal meetings don't need external updates
     */
    async updateMeeting(_externalId: string, _params: UpdateMeetingParams): Promise<ProviderMeetingResult> {
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return {
            provider: 'internal',
            externalId: 'internal',
            joinUrl: `${baseUrl}/meeting/{{meetingId}}`,
            hostUrl: `${baseUrl}/meeting/{{meetingId}}?host=true`,
        };
    }

    /**
     * Internal meetings don't need external cancellation
     */
    async cancelMeeting(_externalId: string): Promise<void> {
        // No-op for internal meetings
    }
}

// Export singleton instance
export const internalProvider = new InternalMeetingProvider();
