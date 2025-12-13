import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  MessageSquare,
  Search,
  Users,
  Hash,
  Lock,
  Brain,
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Phone,
  Video,
  CheckSquare,
  Sparkles,
  Image,
  Mic,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import { apiClient } from "@/lib/api";
import { socketClient } from "@/lib/socket";
import { toast } from "sonner";
import { format } from "date-fns";
import { NewChatModal } from "@/components/NewChatModal";

interface Channel {
  _id: string;
  workspaceId: string;
  name: string;
  displayName?: string;
  slug: string;
  type: 'channel' | 'private_channel' | 'dm';
  aiMode: 'active' | 'off';
  memberIds: string[];
  memberCount: number;
  createdAt: string;
}

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  role: 'omni' | 'crew' | 'guest';
}

interface Message {
  _id: string;
  sender: {
    _id: string;
    name: string;
    email: string;
  };
  content: string;
  attachments: any[];
  allowAi?: boolean;
  createdAt: string;
}

const Chat = () => {
  const { currentWorkspace, user } = useApp();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [allowAi, setAllowAi] = useState(false); // For DM messages
  const [loading, setLoading] = useState(true);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [directMessages, setDirectMessages] = useState<any[]>([]);

  // Helper to map DM to Channel-like object
  const mapDMToChannel = (dm: any): Channel => {
    // Find other participant
    const otherPart = dm.participants.find((p: any) => p._id !== user?._id) || dm.participants[0];
    const name = otherPart ? otherPart.name : "Unknown User";
    return {
      _id: dm._id,
      workspaceId: dm.workspaceId || 'dm',
      name: name,
      displayName: name,
      slug: `dm-${dm._id}`,
      type: 'dm',
      aiMode: 'off',
      memberIds: dm.participants.map((p: any) => p._id),
      memberCount: dm.participants.length,
      createdAt: dm.createdAt
    };
  };

  // Auto-open DM from URL
  useEffect(() => {
    const targetUserId = searchParams.get('userId');
    if (targetUserId && currentWorkspace && user) {
      // We wait for DMs to be loaded or at least available
      // But logic below relies on directMessages state which is async.
      // If directMessages is empty, we might mis-fire create new.
      // Let's modify: we only try this if we are not loading? 
      // Or we rely on the fact that if it exists it will be found.

      if (loading) return;

      // Check if DM exists
      const existing = directMessages.find(d => d.participants.some((p: any) => p._id === targetUserId));
      if (existing) {
        setActiveChannel(mapDMToChannel(existing));
        // Clear param
        navigate('/chat', { replace: true });
      } else {
        // Check if user is in team members to create new
        const createNewDM = async () => {
          try {
            const res = await apiClient.createDM({
              participants: [targetUserId],
              workspaceId: currentWorkspace._id
            });
            setDirectMessages(prev => [...prev, res.dm]);
            setActiveChannel(mapDMToChannel(res.dm));
            navigate('/chat', { replace: true });
          } catch (err: any) {
            console.error(err);
            toast.error("Failed to start chat: " + err.message);
          }
        };
        createNewDM();
      }
    }
  }, [searchParams, directMessages, currentWorkspace, user, loading, navigate]);

  useEffect(() => {
    if (!currentWorkspace) {
      setChannels([]);
      setTeamMembers([]);
      setActiveChannel(null);
      setDirectMessages([]); // Clear DMs
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch channels with workspace context
        const channelsResult = await apiClient.getChannels(currentWorkspace._id);

        // Fetch DMs
        try {
          const dmsResult = await apiClient.getDMs();
          setDirectMessages(dmsResult.dms || []);
        } catch (error) {
          console.error("Failed to fetch DMs", error);
        }

        // Store workspace info for display
        const workspaceInfo = channelsResult.workspace;

        // Sort channels: regular channels first, then private channels
        const sortedChannels = channelsResult.channels.sort((a: Channel, b: Channel) => {
          if (a.type !== b.type) {
            return a.type === 'channel' ? -1 : 1;
          }
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        setChannels(sortedChannels);

        // Set active channel if none selected or if current one doesn't exist
        // Prefer channels first, ONLY if no userId intent
        const targetUserId = searchParams.get('userId');
        if (!targetUserId && sortedChannels.length > 0 && !activeChannel) {
          setActiveChannel(sortedChannels[0]);
        }

        // Fetch team members for direct messages
        try {
          const membersResult = await apiClient.getWorkspaceMembersForChat(currentWorkspace._id);
          // Filter out current user
          const otherMembers = membersResult.members.filter((m: TeamMember) => m._id !== user?._id);
          setTeamMembers(otherMembers);
        } catch (error) {
          console.error('Failed to load team members:', error);
          setTeamMembers([]);
        }
      } catch (error: any) {
        toast.error(error.message || 'Failed to load channels');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Listen for channel updates
    const handleChannelUpdate = () => {
      fetchData();
    };

    const handleMembershipChange = (data: any) => {
      if (data?.membership?.workspaceId === currentWorkspace._id) {
        fetchData();
      }
    };

    socketClient.on('channel:new', handleChannelUpdate);
    socketClient.on('workspace:membership:changed', handleMembershipChange);

    return () => {
      socketClient.off('channel:new', handleChannelUpdate);
      socketClient.off('workspace:membership:changed', handleMembershipChange);
    };
  }, [currentWorkspace, user]);

  useEffect(() => {
    // If we have an active channel that is actually a DM (mapped), we need to handle it differently?
    // Actually, distinct handling for messages is needed.
    if (!activeChannel || !currentWorkspace) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    const isDM = activeChannel.type === 'dm';

    const fetchMessages = async () => {
      try {
        // Don't set global loading here to avoid flashing, maybe local loading?
        // setLoading(true); 
        let result;

        if (isDM) {
          result = await apiClient.getDMMessages(activeChannel._id);
        } else {
          result = await apiClient.getMessages(currentWorkspace._id, activeChannel._id);
        }

        if (isMounted) {
          setMessages(result.messages || []);
          setTimeout(() => scrollToBottom(), 100);
        }
      } catch (error: any) {
        if (isMounted) {
          // Don't show error for empty DMs usually, but useful for debug
          console.error('Failed to load messages:', error);
        }
      }
    };

    fetchMessages();

    // Join room
    // For DMs, we might need a specific socket room logic if not using channel ID
    // Assuming backend socket logic handles DM rooms by ID just like channels
    if (!isDM) {
      socketClient.joinChannel(currentWorkspace._id, activeChannel._id);
    }

    const handleNewMessage = (data: any) => {
      if (!isMounted) return;

      const messageChannelId = String(data.message?.channelId || data.message?.dmId || '');
      const activeId = String(activeChannel._id || '');

      // Check if message belongs to current view (Channel or DM)
      // Note: Backend might send `channelId` for channels and `dmId`??
      // 'messages.ts' sends 'message:new' with channelId.
      // We need to verify what DMs send.

      // For now, let's assume generic matching.
      if (messageChannelId === activeId || (isDM && data.message.channelId === activeId)) {
        // ... (existing message dedupe logic)
        setMessages((prev) => {
          const exists = prev.some((msg) => msg._id === data.message._id);
          if (exists) return prev;
          return [...prev, data.message];
        });
        setTimeout(() => scrollToBottom(), 50);
      }
    };

    socketClient.on('message:new', handleNewMessage);

    return () => {
      isMounted = false;
      if (!isDM) {
        socketClient.leaveChannel(currentWorkspace._id, activeChannel._id);
      }
      socketClient.off('message:new', handleNewMessage);
    };
  }, [activeChannel, currentWorkspace]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !activeChannel || !currentWorkspace || !user) return;

    const messageText = message.trim();
    setMessage("");

    const tempMessage: Message = {
      _id: `temp-${Date.now()}`,
      sender: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
      content: messageText,
      attachments: [],
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMessage]);
    setTimeout(() => scrollToBottom(), 50);

    try {
      const isDM = activeChannel.type === 'dm';
      let result;

      if (isDM) {
        result = await apiClient.sendDMMessage(activeChannel._id, {
          text: messageText,
          allowAi: allowAi
        });
      } else {
        result = await apiClient.createMessage(currentWorkspace._id, activeChannel._id, {
          content: messageText,
          attachments: [],
        });
      }

      if (allowAi) setAllowAi(false);

      if (result.message) {
        setMessages((prev) => {
          const filtered = prev.filter((msg) => msg._id !== tempMessage._id);
          const exists = filtered.some((msg) => msg._id === result.message._id);
          if (exists) return filtered;
          return [...filtered, result.message];
        });
        setTimeout(() => scrollToBottom(), 50);
      } else {
        setMessages((prev) => prev.filter((msg) => msg._id !== tempMessage._id));
      }
    } catch (error: any) {
      setMessages((prev) => prev.filter((msg) => msg._id !== tempMessage._id));
      toast.error(error.message || 'Failed to send message');
      setMessage(messageText);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'h:mm a');
    } catch {
      return '';
    }
  };

  if (loading && channels.length === 0 && directMessages.length === 0) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-64 border-r border-border bg-card/50 flex flex-col">
        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search chats..." className="pl-9 bg-secondary/50 border-0" />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {/* Channels List */}
          <div className="p-4 pb-0">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Channels</span>
            </div>
            <div className="space-y-1">
              {channels.map(channel => (
                <button
                  key={channel._id}
                  onClick={() => {
                    setActiveChannel(channel);
                    setMessages([]);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                    activeChannel?._id === channel._id ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-foreground"
                  )}
                >
                  {channel.type === 'private_channel' ? <Lock className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                  <span className="truncate">{channel.displayName}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Direct Messages List */}
          <div className="p-4 border-t border-border mt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Direct Messages</span>
              <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={() => setNewChatOpen(true)}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            <div className="space-y-1">
              {directMessages.map(dm => {
                const mapped = mapDMToChannel(dm);
                return (
                  <button
                    key={mapped._id}
                    onClick={() => {
                      setActiveChannel(mapped);
                      setMessages([]);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                      activeChannel?._id === mapped._id ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-foreground"
                    )}
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs">
                      {getInitials(mapped.name)}
                    </div>
                    <span className="truncate">{mapped.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Start Conversation Section (User List) */}
          <div className="p-4 border-t border-border mt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Start New Chat</span>
            </div>
            <div className="space-y-1">
              {teamMembers.slice(0, 5).map(member => (
                <button
                  key={member._id}
                  onClick={async () => {
                    // Check if DM exists
                    const existing = directMessages.find(d => d.participants.some((p: any) => p._id === member._id));
                    if (existing) {
                      setActiveChannel(mapDMToChannel(existing));
                    } else {
                      // Create new DM
                      try {
                        const res = await apiClient.createDM({
                          participants: [member._id],
                          workspaceId: currentWorkspace._id
                        });
                        setDirectMessages(prev => [...prev, res.dm]);
                        setActiveChannel(mapDMToChannel(res.dm));
                      } catch (err: any) {
                        toast.error(err.message);
                      }
                    }
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-secondary transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-700">
                    {getInitials(member.name)}
                  </div>
                  <span className="truncate">{member.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeChannel ? (
          <>
            <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-card/50">
              <div className="flex items-center gap-3">
                {activeChannel.type === 'dm' ? (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {getInitials(activeChannel.name)}
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Hash className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div>
                  <h2 className="font-semibold">{activeChannel.displayName || activeChannel.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {activeChannel.type === 'dm' ? 'Direct Message' : `${activeChannel.memberCount} members`}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages List - Existing logic reused mostly */}
            <div className="flex-1 overflow-auto p-4 md:p-6">
              {messages.map((msg, index) => {
                const isOwn = msg.sender._id === user?._id;
                // ... (existing message rendering)
                return (
                  <div key={msg._id} className={cn("flex gap-3 mb-4", isOwn && "flex-row-reverse")}>
                    <div className={cn("max-w-[70%] rounded-2xl px-4 py-2", isOwn ? "bg-primary text-primary-foreground" : "bg-secondary")}>
                      {!isOwn && <p className="text-xs font-bold mb-1 opacity-70">{msg.sender.name}</p>}
                      <p>{msg.content}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area - Existing logic reused */}
            <div className="p-4 border-t border-border bg-card/50">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                {/* Attachments, etc */}
                <Input
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={`Message ${activeChannel.name}`}
                  className="flex-1"
                />
                <Button type="submit" disabled={!message.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation
          </div>
        )}
      </div>

      {/* Keep NewChatModal */}
      {currentWorkspace && (
        <NewChatModal
          open={newChatOpen}
          onOpenChange={setNewChatOpen}
          workspaceId={currentWorkspace._id}
          onChatCreated={(chat) => {
            // Handle new chat creation which might return a DM or Channel
            if (chat.type === 'dm') {
              // ideally re-fetch DMs
              apiClient.getDMs().then(res => setDirectMessages(res.dms));
            } else {
              apiClient.getChannels(currentWorkspace._id).then(res => setChannels(res.channels));
            }
          }}
        />
      )}
    </div>
  );
};

export default Chat;
