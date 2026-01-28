/**
 * Zoom Meeting Provider
 * 
 * VIDEO_PROVIDER_HOOK: Zoom OAuth integration
 * 
 * Requirements:
 * - ZOOM_CLIENT_ID: Zoom OAuth App Client ID
 * - ZOOM_CLIENT_SECRET: Zoom OAuth App Client Secret
 * - ZOOM_ACCOUNT_ID: Zoom Account ID (for Server-to-Server OAuth)
 * 
 * This uses Zoom's Server-to-Server OAuth for creating meetings
 * on behalf of the workspace. Users don't need individual Zoom accounts.
 * 
 * Setup Guide: https://developers.zoom.us/docs/internal-apps/s2s-oauth/
 */

import {
    IMeetingProvider,
    CreateMeetingParams,
    UpdateMeetingParams,
    ProviderMeetingResult,
    ProviderStatus,
} from './meetingProvider.interface';
import { MeetingProvider } from '../../../models/Meeting';

// Token response type
interface ZoomTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

// Zoom meeting response type
interface ZoomMeetingResponse {
    id: number;
    topic: string;
    join_url: string;
    start_url: string;
    password?: string;
}

// Token cache
let accessToken: string | null = null;
let tokenExpiry: number = 0;

export class ZoomMeetingProvider implements IMeetingProvider {
    readonly name: MeetingProvider = 'zoom';

    private get clientId(): string | undefined {
        return process.env.ZOOM_CLIENT_ID;
    }

    private get clientSecret(): string | undefined {
        return process.env.ZOOM_CLIENT_SECRET;
    }

    private get accountId(): string | undefined {
        return process.env.ZOOM_ACCOUNT_ID;
    }

    /**
     * Check if Zoom is properly configured
     */
    isConfigured(): boolean {
        return !!(this.clientId && this.clientSecret && this.accountId);
    }

    getStatus(): ProviderStatus {
        if (!this.isConfigured()) {
            return {
                name: 'zoom',
                configured: false,
                error: 'Missing ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, or ZOOM_ACCOUNT_ID',
            };
        }
        return {
            name: 'zoom',
            configured: true,
        };
    }

    /**
     * Get OAuth access token using Server-to-Server OAuth
     */
    private async getAccessToken(): Promise<string> {
        // Return cached token if still valid
        if (accessToken && Date.now() < tokenExpiry - 60000) {
            return accessToken;
        }

        const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

        const response = await fetch('https://zoom.us/oauth/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'account_credentials',
                account_id: this.accountId!,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('[ZoomProvider] Token error:', error);
            throw new Error(`Zoom authentication failed: ${response.status}`);
        }

        const data = await response.json() as ZoomTokenResponse;
        accessToken = data.access_token;
        tokenExpiry = Date.now() + (data.expires_in * 1000);

        return accessToken!;
    }

    /**
     * Create a Zoom meeting
     */
    async createMeeting(params: CreateMeetingParams): Promise<ProviderMeetingResult> {
        if (!this.isConfigured()) {
            throw new Error('Zoom is not configured');
        }

        const token = await this.getAccessToken();

        // Calculate duration in minutes
        let duration = 60; // Default 1 hour
        if (params.startTime && params.endTime) {
            duration = Math.round((params.endTime.getTime() - params.startTime.getTime()) / 60000);
        }

        const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                topic: params.title,
                type: params.startTime ? 2 : 1, // 2 = Scheduled, 1 = Instant
                start_time: params.startTime?.toISOString(),
                duration,
                timezone: params.timezone || 'UTC',
                agenda: params.agenda || params.description,
                settings: {
                    host_video: true,
                    participant_video: true,
                    join_before_host: true,
                    mute_upon_entry: false,
                    waiting_room: false,
                    meeting_authentication: false,
                },
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('[ZoomProvider] Create meeting error:', error);
            throw new Error(`Failed to create Zoom meeting: ${response.status}`);
        }

        const meeting = await response.json() as ZoomMeetingResponse;

        return {
            provider: 'zoom',
            externalId: String(meeting.id),
            joinUrl: meeting.join_url,
            hostUrl: meeting.start_url,
            password: meeting.password,
        };
    }

    /**
     * Update a Zoom meeting
     */
    async updateMeeting(externalId: string, params: UpdateMeetingParams): Promise<ProviderMeetingResult> {
        if (!this.isConfigured()) {
            throw new Error('Zoom is not configured');
        }

        const token = await this.getAccessToken();

        const updateData: Record<string, unknown> = {};
        if (params.title) updateData.topic = params.title;
        if (params.description) updateData.agenda = params.description;
        if (params.startTime) updateData.start_time = params.startTime.toISOString();
        if (params.startTime && params.endTime) {
            updateData.duration = Math.round((params.endTime.getTime() - params.startTime.getTime()) / 60000);
        }

        const response = await fetch(`https://api.zoom.us/v2/meetings/${externalId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
        });

        if (!response.ok && response.status !== 204) {
            const error = await response.text();
            console.error('[ZoomProvider] Update meeting error:', error);
            throw new Error(`Failed to update Zoom meeting: ${response.status}`);
        }

        // Fetch updated meeting details
        const getResponse = await fetch(`https://api.zoom.us/v2/meetings/${externalId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!getResponse.ok) {
            throw new Error(`Failed to get updated Zoom meeting: ${getResponse.status}`);
        }

        const meeting = await getResponse.json() as ZoomMeetingResponse;

        return {
            provider: 'zoom',
            externalId: String(meeting.id),
            joinUrl: meeting.join_url,
            hostUrl: meeting.start_url,
        };
    }

    /**
     * Cancel/delete a Zoom meeting
     */
    async cancelMeeting(externalId: string): Promise<void> {
        if (!this.isConfigured()) {
            return; // Fail silently if not configured
        }

        try {
            const token = await this.getAccessToken();

            await fetch(`https://api.zoom.us/v2/meetings/${externalId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
        } catch (error) {
            console.error('[ZoomProvider] Cancel meeting error:', error);
            // Fail silently as per interface contract
        }
    }
}

// Export singleton instance
export const zoomProvider = new ZoomMeetingProvider();
