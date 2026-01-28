/**
 * Google Meet Provider
 * 
 * VIDEO_PROVIDER_HOOK: Google Calendar API integration
 * 
 * Requirements:
 * - GOOGLE_CLIENT_ID: Google OAuth Client ID
 * - GOOGLE_CLIENT_SECRET: Google OAuth Client Secret
 * - GOOGLE_REFRESH_TOKEN: Long-lived refresh token for service account
 * 
 * This uses Google Calendar API to create events with Meet links.
 * The Meet link is auto-generated when conferenceData is requested.
 * 
 * Setup Guide: 
 * 1. Create Google Cloud project
 * 2. Enable Calendar API
 * 3. Create OAuth credentials
 * 4. Get refresh token via OAuth flow
 */

import {
    IMeetingProvider,
    CreateMeetingParams,
    UpdateMeetingParams,
    ProviderMeetingResult,
    ProviderStatus,
} from './meetingProvider.interface';
import { MeetingProvider } from '../../../models/Meeting';

// Google token response type
interface GoogleTokenResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
}

// Google Calendar event types
interface GoogleCalendarEvent {
    id: string;
    summary: string;
    description?: string;
    start?: { dateTime: string; timeZone?: string };
    end?: { dateTime: string; timeZone?: string };
    hangoutLink?: string;
    conferenceData?: {
        entryPoints?: Array<{
            entryPointType: string;
            uri: string;
        }>;
    };
}

// Token cache
let accessToken: string | null = null;
let tokenExpiry: number = 0;

export class GoogleMeetProvider implements IMeetingProvider {
    readonly name: MeetingProvider = 'google_meet';

    private get clientId(): string | undefined {
        return process.env.GOOGLE_CLIENT_ID;
    }

    private get clientSecret(): string | undefined {
        return process.env.GOOGLE_CLIENT_SECRET;
    }

    private get refreshToken(): string | undefined {
        return process.env.GOOGLE_REFRESH_TOKEN;
    }

    /**
     * Check if Google Meet is properly configured
     */
    isConfigured(): boolean {
        return !!(this.clientId && this.clientSecret && this.refreshToken);
    }

    getStatus(): ProviderStatus {
        if (!this.isConfigured()) {
            return {
                name: 'google_meet',
                configured: false,
                error: 'Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REFRESH_TOKEN',
            };
        }
        return {
            name: 'google_meet',
            configured: true,
        };
    }

    /**
     * Get OAuth access token using refresh token
     */
    private async getAccessToken(): Promise<string> {
        // Return cached token if still valid
        if (accessToken && Date.now() < tokenExpiry - 60000) {
            return accessToken;
        }

        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: this.clientId!,
                client_secret: this.clientSecret!,
                refresh_token: this.refreshToken!,
                grant_type: 'refresh_token',
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('[GoogleMeetProvider] Token error:', error);
            throw new Error(`Google authentication failed: ${response.status}`);
        }

        const data = await response.json() as GoogleTokenResponse;
        accessToken = data.access_token;
        tokenExpiry = Date.now() + (data.expires_in * 1000);

        return accessToken!;
    }

    /**
     * Create a Google Calendar event with Meet link
     */
    async createMeeting(params: CreateMeetingParams): Promise<ProviderMeetingResult> {
        if (!this.isConfigured()) {
            throw new Error('Google Meet is not configured');
        }

        const token = await this.getAccessToken();

        // Default to 1 hour from now if no times provided
        const startTime = params.startTime || new Date();
        const endTime = params.endTime || new Date(startTime.getTime() + 60 * 60 * 1000);

        const event = {
            summary: params.title,
            description: params.description || params.agenda,
            start: {
                dateTime: startTime.toISOString(),
                timeZone: params.timezone || 'UTC',
            },
            end: {
                dateTime: endTime.toISOString(),
                timeZone: params.timezone || 'UTC',
            },
            attendees: params.participantEmails?.map(email => ({ email })) || [],
            conferenceData: {
                createRequest: {
                    requestId: `meeting-${Date.now()}`,
                    conferenceSolutionKey: { type: 'hangoutsMeet' },
                },
            },
        };

        const response = await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(event),
            }
        );

        if (!response.ok) {
            const error = await response.text();
            console.error('[GoogleMeetProvider] Create event error:', error);
            throw new Error(`Failed to create Google Meet: ${response.status}`);
        }

        const createdEvent = await response.json() as GoogleCalendarEvent;
        const meetLink = createdEvent.conferenceData?.entryPoints?.find(
            (ep) => ep.entryPointType === 'video'
        )?.uri;

        if (!meetLink) {
            throw new Error('Failed to generate Google Meet link');
        }

        return {
            provider: 'google_meet',
            externalId: createdEvent.id,
            joinUrl: meetLink,
            hostUrl: meetLink, // Same URL for Google Meet
        };
    }

    /**
     * Update a Google Calendar event
     */
    async updateMeeting(externalId: string, params: UpdateMeetingParams): Promise<ProviderMeetingResult> {
        if (!this.isConfigured()) {
            throw new Error('Google Meet is not configured');
        }

        const token = await this.getAccessToken();

        // First fetch the existing event
        const getResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${externalId}`,
            {
                headers: { 'Authorization': `Bearer ${token}` },
            }
        );

        if (!getResponse.ok) {
            throw new Error(`Failed to get Google Calendar event: ${getResponse.status}`);
        }

        const existingEvent = await getResponse.json() as GoogleCalendarEvent;

        // Build update payload
        const updateData: Record<string, unknown> = {
            summary: params.title || existingEvent.summary,
            description: params.description || existingEvent.description,
        };

        if (params.startTime) {
            updateData.start = {
                dateTime: params.startTime.toISOString(),
                timeZone: existingEvent.start?.timeZone || 'UTC',
            };
        } else {
            updateData.start = existingEvent.start;
        }

        if (params.endTime) {
            updateData.end = {
                dateTime: params.endTime.toISOString(),
                timeZone: existingEvent.end?.timeZone || 'UTC',
            };
        } else {
            updateData.end = existingEvent.end;
        }

        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${externalId}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            }
        );

        if (!response.ok) {
            const error = await response.text();
            console.error('[GoogleMeetProvider] Update event error:', error);
            throw new Error(`Failed to update Google Meet: ${response.status}`);
        }

        const updatedEvent = await response.json() as GoogleCalendarEvent;
        const meetLink = updatedEvent.conferenceData?.entryPoints?.find(
            (ep) => ep.entryPointType === 'video'
        )?.uri;

        return {
            provider: 'google_meet',
            externalId: updatedEvent.id,
            joinUrl: meetLink || existingEvent.hangoutLink || '',
            hostUrl: meetLink || existingEvent.hangoutLink || '',
        };
    }

    /**
     * Delete a Google Calendar event
     */
    async cancelMeeting(externalId: string): Promise<void> {
        if (!this.isConfigured()) {
            return; // Fail silently if not configured
        }

        try {
            const token = await this.getAccessToken();

            await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events/${externalId}`,
                {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` },
                }
            );
        } catch (error) {
            console.error('[GoogleMeetProvider] Cancel meeting error:', error);
            // Fail silently as per interface contract
        }
    }
}

// Export singleton instance
export const googleMeetProvider = new GoogleMeetProvider();
