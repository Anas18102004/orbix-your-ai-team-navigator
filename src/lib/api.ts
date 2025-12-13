// Use relative URLs in browser (for Vite proxy) or absolute URL for server-side
const API_BASE_URL = typeof window !== 'undefined'
  ? '' // Use relative URLs in browser (Vite proxy will handle it)
  : (import.meta.env.VITE_API_URL || 'http://localhost:3000');

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // Try to get token from localStorage
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    } else if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Use relative URL in browser, absolute in Node.js
    const url = this.baseUrl ? `${this.baseUrl}${endpoint}` : endpoint;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || errorMessage;
      } catch {
        // If response is not JSON, try to get text
        try {
          const text = await response.text();
          errorMessage = text || errorMessage;
        } catch {
          // If all else fails, provide a helpful message
          if (response.status === 0 || response.status >= 500) {
            errorMessage = 'Server error. Please check if the backend server is running.';
          } else if (response.status === 404) {
            errorMessage = 'Endpoint not found. Please check the API URL.';
          } else if (response.status === 401) {
            errorMessage = 'Invalid credentials. Please check your email and password.';
          } else if (response.status === 403) {
            errorMessage = 'Access forbidden.';
          } else {
            errorMessage = `Request failed with status ${response.status}`;
          }
        }
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Auth
  async register(data: { name: string; email: string; password: string }) {
    const result = await this.request<{ user: any; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(result.token);
    return result;
  }

  async login(data: { email: string; password: string }) {
    const result = await this.request<{ user: any; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(result.token);
    return result;
  }

  async getMe() {
    return this.request<{ user: any }>('/api/auth/me');
  }

  // Workspaces
  async getWorkspaces() {
    return this.request<{ workspaces: any[] }>('/api/workspaces');
  }

  async getWorkspace(id: string) {
    return this.request<{ workspace: any }>(`/api/workspaces/${id}`);
  }

  async createWorkspace(data: { name: string; description: string; orgId?: string }) {
    return this.request<{ workspace: any }>('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createOrganization(data: { name: string }) {
    return this.request<{ organization: any }>('/api/organizations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getOrganizations() {
    return this.request<{ organizations: any[] }>('/api/organizations');
  }

  async getOrganization(orgId: string) {
    return this.request<{ organization: any; workspaces: any[] }>(`/api/organizations/${orgId}`);
  }

  // Workspace-level invite code (creates invite code only)
  async createInvite(workspaceId: string) {
    return this.request<{ invite: any }>(`/api/workspaces/${workspaceId}/invites`, {
      method: 'POST',
    });
  }

  async inviteByEmail(workspaceId: string, email: string) {
    return this.request<{
      invite: any;
      emailSent: boolean;
      message: string;
      emailError?: string | null;
      emailErrorCode?: string | null;
    }>(`/api/workspaces/${workspaceId}/invites/email`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async joinWorkspace(code: string) {
    return this.request<{ workspace: any }>('/api/workspaces/join', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  // New invite endpoints (org/workspace, email-based)
  async createInviteAdvanced(data: {
    email: string;
    invitedRole: 'org_admin' | 'omni' | 'crew';
    invitedSpecialization?: 'backend' | 'frontend' | 'qa' | 'devops' | 'pm' | 'design' | null;
    roleDecisionMode?: 'fixed' | 'pending';
    workspaceId?: string;
    orgId?: string;
  }) {
    return this.request<{ invite: any; emailSent: boolean; message: string }>('/api/invites', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async acceptInviteById(inviteId: string) {
    return this.request<{ workspace?: any; organization?: any; membership?: any; message: string }>(
      `/api/invites/${inviteId}/accept`,
      {
        method: 'POST',
      }
    );
  }

  async joinByCode(code: string) {
    return this.request<{ workspace: any; membership: any }>('/api/invites/join-by-code', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async getPendingMembers(workspaceId: string) {
    return this.request<{ members: any[] }>(`/api/invites/${workspaceId}/pending-members`);
  }

  async finalizeMemberRole(workspaceId: string, memberId: string, data: {
    specialization?: 'backend' | 'frontend' | 'qa' | 'devops' | 'pm' | 'design' | null;
    role?: 'omni' | 'crew';
  }) {
    return this.request<{ success: boolean; member: any; message: string }>(
      `/api/invites/${workspaceId}/members/${memberId}/finalize-role`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  }

  async getWorkspaceMembers(workspaceId: string) {
    return this.request<{
      members: any[];
      omnis: any[];
      crew: any[];
      pendingCrew: any[];
      stats: any;
      viewerRole?: 'org_admin' | 'omni' | 'crew';
      canSeeFullInfo?: boolean;
    }>(`/api/workspaces/${workspaceId}/members`);
  }

  // Member management
  async removeMember(workspaceId: string, memberId: string) {
    return this.request<{ success: boolean; message: string }>(
      `/api/workspaces/${workspaceId}/members/${memberId}`,
      { method: 'DELETE' }
    );
  }

  async assignSpecialization(workspaceId: string, memberId: string, specialization: string | null) {
    return this.request<{ success: boolean; member: any; message: string }>(
      `/api/workspaces/${workspaceId}/members/${memberId}/specialization`,
      {
        method: 'PATCH',
        body: JSON.stringify({ specialization }),
      }
    );
  }

  async promoteMember(workspaceId: string, memberId: string) {
    return this.request<{ success: boolean; member: any; message: string }>(
      `/api/workspaces/${workspaceId}/members/${memberId}/promote`,
      { method: 'POST' }
    );
  }

  async demoteMember(workspaceId: string, memberId: string) {
    return this.request<{ success: boolean; member: any; message: string }>(
      `/api/workspaces/${workspaceId}/members/${memberId}/demote`,
      { method: 'POST' }
    );
  }

  // Project Profile
  async saveProjectProfile(workspaceId: string, data: { projectProfile: any; aiSettings?: any }) {
    return this.request<{ success: boolean; workspace: any }>(
      `/api/workspaces/${workspaceId}/project-profile`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async getProjectProfile(workspaceId: string) {
    return this.request<{ projectProfile: any }>(`/api/workspaces/${workspaceId}/project-profile`);
  }

  // Team Config
  async updateTeamConfig(workspaceId: string, data: { acceptedCrewPlan: Array<{ specialization: string; desiredCount: number }> }) {
    return this.request<{ success: boolean; teamConfig: any }>(
      `/api/workspaces/${workspaceId}/team-config`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  }

  async getTeamConfig(workspaceId: string) {
    return this.request<{ teamConfig: any }>(`/api/workspaces/${workspaceId}/team-config`);
  }

  // Project Pulse
  async getProjectPulse(workspaceId: string) {
    return this.request<{ stats: any; activityTimeline: any[] }>(`/api/workspaces/${workspaceId}/pulse`);
  }

  // Invites with specialization
  async createInviteWithSpecialization(workspaceId: string, data: { specialization?: string; inviteType?: string }) {
    return this.request<{ invite: any }>(`/api/workspaces/${workspaceId}/invites`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async inviteByEmailWithSpecialization(workspaceId: string, data: { email: string; specialization?: string }) {
    return this.request<{
      invite: any;
      emailSent: boolean;
      message: string;
    }>(`/api/workspaces/${workspaceId}/invites/email`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async inviteOmni(workspaceId: string, data: { email: string }) {
    return this.request<{
      invite: any;
      emailSent: boolean;
      message: string;
    }>(`/api/workspaces/${workspaceId}/invites/omni`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Get workspace members for chat (all members can access)
  async getWorkspaceMembersForChat(workspaceId: string) {
    // Use the chat-specific endpoint which allows all workspace members
    return this.request<{ members: any[] }>(`/api/workspaces/${workspaceId}/members/chat`);
  }

  // Channels
  async getChannels(workspaceId: string) {
    return this.request<{ workspace: any; channels: any[] }>(`/api/workspaces/${workspaceId}/channels`);
  }

  async createChannel(workspaceId: string, data: { name: string; displayName?: string; type?: 'channel' | 'private_channel'; memberIds?: string[]; aiMode?: 'active' | 'off' }) {
    return this.request<{ channel: any }>(`/api/workspaces/${workspaceId}/channels`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateChannelAiMode(channelId: string, aiMode: 'active' | 'off') {
    return this.request<{ channel: any }>(`/api/channels/${channelId}`, {
      method: 'PATCH',
      body: JSON.stringify({ aiMode }),
    });
  }

  // DMs
  async getDMs() {
    return this.request<{ dms: any[] }>('/api/dms');
  }

  async createDM(data: { participants: string[]; workspaceId?: string }) {
    return this.request<{ dm: any }>('/api/dms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getDMMessages(dmId: string) {
    return this.request<{ dm: any; messages: any[] }>(`/api/dms/${dmId}/messages`);
  }

  async sendDMMessage(dmId: string, data: { text: string; attachments?: any[]; allowAi?: boolean }) {
    return this.request<{ message: any }>(`/api/dms/${dmId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // New Chat
  async createNewChat(data: { participants: string[]; workspaceId?: string }) {
    return this.request<{ type: 'dm' | 'private_channel'; dm?: any; channel?: any }>('/api/chats/new', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Project Updates
  async getProjectUpdates(workspaceId: string) {
    return this.request<{ workspace: any; health: any; timeline: any[]; summaries: any[] }>(`/api/workspaces/${workspaceId}/updates`);
  }

  async generateProjectUpdate(workspaceId: string) {
    return this.request<{ summary: any; message: string }>(`/api/workspaces/${workspaceId}/updates/generate`, {
      method: 'POST',
    });
  }

  // Meetings API
  async createMeeting(workspaceId: string, data: {
    title: string;
    agenda?: string;
    startTime?: string;
    durationMinutes?: number;
    participantIds?: string[];
    record?: boolean;
  }) {
    return this.request<{ meetingId: string; meeting: any }>(`/api/workspaces/${workspaceId}/meetings`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMeetings(workspaceId: string, status?: 'upcoming' | 'past') {
    const query = status ? `?status=${status}` : '';
    return this.request<Array<any>>(`/api/workspaces/${workspaceId}/meetings${query}`);
  }

  async getMeeting(meetingId: string) {
    return this.request<any>(`/api/meetings/${meetingId}`);
  }

  async joinMeeting(meetingId: string, consent: { recording: boolean; transcription: boolean }) {
    return this.request<{
      joinMode: 'sfu' | 'managed';
      routerRtpCapabilities?: any;
      createTransportToken?: string;
      turn?: { urls: string[]; username: string; credential: string };
      providerJoinUrl?: string;
      providerToken?: string;
      meeting: any;
    }>(`/api/meetings/${meetingId}/join`, {
      method: 'POST',
      body: JSON.stringify({ consent }),
    });
  }

  async leaveMeeting(meetingId: string) {
    return this.request<{ success: boolean }>(`/api/meetings/${meetingId}/leave`, {
      method: 'POST',
    });
  }

  async startMeeting(meetingId: string) {
    return this.request<{ meeting: any }>(`/api/meetings/${meetingId}/start`, {
      method: 'POST',
    });
  }

  async endMeeting(meetingId: string) {
    return this.request<{ meeting: any }>(`/api/meetings/${meetingId}/end`, {
      method: 'POST',
    });
  }

  async deleteMeeting(meetingId: string) {
    return this.request<{ success: boolean }>(`/api/meetings/${meetingId}`, {
      method: 'DELETE',
    });
  }

  async startRecording(meetingId: string) {
    return this.request<{ recording: any }>(`/api/meetings/${meetingId}/recording/start`, {
      method: 'POST',
    });
  }

  async stopRecording(meetingId: string) {
    return this.request<{ recording: any }>(`/api/meetings/${meetingId}/recording/stop`, {
      method: 'POST',
    });
  }

  async getRecordingPlaybackUrl(meetingId: string, recordingId: string) {
    return this.request<{ playbackUrl: string; expiresIn: number; recording: any }>(
      `/api/meetings/${meetingId}/recordings/${recordingId}/playback`
    );
  }

  async getAIContextDoc(workspaceId: string, docId: string) {
    return this.request<any>(`/api/workspaces/${workspaceId}/ai-context/${docId}`);
  }

  // Messages
  async getMessages(workspaceId: string, channelId: string, page = 1, limit = 50) {
    return this.request<{ messages: any[]; pagination: any }>(
      `/api/workspaces/${workspaceId}/channels/${channelId}/messages?page=${page}&limit=${limit}`
    );
  }

  async createMessage(workspaceId: string, channelId: string, data: { content: string; attachments?: any[] }) {
    return this.request<{ message: any }>(
      `/api/workspaces/${workspaceId}/channels/${channelId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  // Tasks
  async getTasks(workspaceId: string) {
    return this.request<{ tasks: any[] }>(`/api/workspaces/${workspaceId}/tasks`);
  }

  async getMyTasks(workspaceId: string) {
    return this.request<{ tasks: any[] }>(`/api/workspaces/${workspaceId}/tasks/my`);
  }

  async createTask(workspaceId: string, data: {
    title: string;
    description: string;
    priority?: string;
    assigneeId?: string;
    relatedMessageId?: string;
    dueDate?: string;
  }) {
    return this.request<{ task: any }>(`/api/workspaces/${workspaceId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(workspaceId: string, taskId: string, data: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    assigneeId?: string;
    dueDate?: string;
  }) {
    return this.request<{ task: any }>(`/api/workspaces/${workspaceId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Notifications
  async getNotifications(read?: boolean) {
    const query = read !== undefined ? `?read=${read}` : '';
    return this.request<{ notifications: any[] }>(`/api/notifications${query}`);
  }

  async markNotificationRead(notificationId: string) {
    return this.request<{ notification: any }>(`/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  }

  async acceptInvite(inviteId: string) {
    return this.request<{ workspace: any; message: string }>(`/api/workspaces/invites/${inviteId}/accept`, {
      method: 'POST',
    });
  }

  async rejectInvite(inviteId: string) {
    return this.request<{ message: string }>(`/api/workspaces/invites/${inviteId}/reject`, {
      method: 'POST',
    });
  }

  // AI & AIBrain
  async getAiContext(workspaceId: string, channelId?: string) {
    const query = channelId ? `?channelId=${channelId}` : '';
    return this.request<{ context: any; sources: any[] }>(`/api/workspaces/${workspaceId}/ai/context${query}`);
  }

  async askAi(workspaceId: string, data: { query: string; contextIds?: string[]; mode?: 'assist' | 'auto' }) {
    return this.request<{ runId: string; status: string }>(`/api/workspaces/${workspaceId}/ai/ask`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async acceptAiProposal(workspaceId: string, proposalId: string) {
    return this.request<{ success: boolean; task?: any }>(`/api/workspaces/${workspaceId}/ai/proposal/${proposalId}/accept`, {
      method: 'POST'
    });
  }

  async rejectAiProposal(workspaceId: string, proposalId: string) {
    return this.request<{ success: boolean }>(`/api/workspaces/${workspaceId}/ai/proposal/${proposalId}/reject`, {
      method: 'POST'
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

