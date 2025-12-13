export interface ParticipantState {
    userId: string;
    socketId: string;
    name: string;
    role: 'org_admin' | 'omni' | 'crew';
    joinedAt: Date;
    micOn: boolean;
    cameraOn: boolean;
    screenSharing: boolean;
    handRaised: boolean;
}

export class MeetingManager {
    private static instance: MeetingManager;
    // meetingId -> Set<ParticipantState>
    private meetings: Map<string, Map<string, ParticipantState>> = new Map();

    private constructor() { }

    public static getInstance(): MeetingManager {
        if (!MeetingManager.instance) {
            MeetingManager.instance = new MeetingManager();
        }
        return MeetingManager.instance;
    }

    public addParticipant(meetingId: string, participant: ParticipantState): void {
        if (!this.meetings.has(meetingId)) {
            this.meetings.set(meetingId, new Map());
        }
        const meetingParticipants = this.meetings.get(meetingId)!;
        meetingParticipants.set(participant.userId, participant);
        console.log(`[MeetingManager] Added ${participant.name} (${participant.role}) to meeting ${meetingId}. Total: ${meetingParticipants.size}`);
    }

    public removeParticipant(meetingId: string, userId: string): boolean {
        const meetingParticipants = this.meetings.get(meetingId);
        if (!meetingParticipants) return false;

        const removed = meetingParticipants.delete(userId);
        if (meetingParticipants.size === 0) {
            this.meetings.delete(meetingId);
            console.log(`[MeetingManager] Meeting ${meetingId} is now empty and cleared.`);
        } else {
            console.log(`[MeetingManager] Removed user ${userId} from meeting ${meetingId}. Remaining: ${meetingParticipants.size}`);
        }
        return removed;
    }

    public getParticipant(meetingId: string, userId: string): ParticipantState | undefined {
        return this.meetings.get(meetingId)?.get(userId);
    }

    public getParticipantBySocketId(socketId: string): { meetingId: string, participant: ParticipantState } | null {
        for (const [meetingId, participants] of this.meetings.entries()) {
            for (const participant of participants.values()) {
                if (participant.socketId === socketId) {
                    return { meetingId, participant };
                }
            }
        }
        return null;
    }

    public getParticipants(meetingId: string): ParticipantState[] {
        const meetingParticipants = this.meetings.get(meetingId);
        return meetingParticipants ? Array.from(meetingParticipants.values()) : [];
    }

    public updateParticipantState(meetingId: string, userId: string, updates: Partial<ParticipantState>): ParticipantState | null {
        const meetingParticipants = this.meetings.get(meetingId);
        if (!meetingParticipants) return null;

        const participant = meetingParticipants.get(userId);
        if (!participant) return null;

        const updatedParticipant = { ...participant, ...updates };
        meetingParticipants.set(userId, updatedParticipant);
        return updatedParticipant;
    }
}
