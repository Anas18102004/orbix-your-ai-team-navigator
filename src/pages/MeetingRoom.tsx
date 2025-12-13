import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  Users,
  MessageSquare,
  X,
  Loader2,
  CheckCircle2,
  Sparkles,
  Link,
  Settings,
  MoreVertical,
  Maximize2,
  LayoutGrid,
  PhoneOff,
  Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useApp } from "@/contexts/AppContext";
import { apiClient } from "@/lib/api";
import { socketClient } from "@/lib/socket";
import { toast } from "sonner";
import { format } from "date-fns";
import { DeviceSelector } from "@/components/meetings/DeviceSelector";
import { useMediasoup } from "@/hooks/useMediasoup";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type MeetingPhase = 'pre-join' | 'in-meeting' | 'ended' | 'summary';

interface Meeting {
  _id: string;
  title: string;
  agenda?: string;
  status: string;
  startTime?: string | Date;
  endTime?: string | Date;
  organizer: { name: string; email: string };
  participants: Array<{
    userId: string;
    user?: { name: string; email: string };
    joinedAt: string | null;
  }>;
  recordingIds: string[];
  aiSummaryId?: string;
}

interface ParticipantState {
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

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Date;
}

// --- REUSABLE VIDEO TILE ---
const VideoTile = ({
  isLocal = false,
  participantId,
  name,
  role,
  mirror = false,
  stream,
  consumer,
  isMuted = false,
  isActiveSpeaker = false,
  cameraOff = false
}: {
  isLocal?: boolean;
  participantId?: string;
  name?: string;
  role?: string;
  mirror?: boolean;
  stream?: MediaStream | null;
  consumer?: any;
  isMuted?: boolean;
  isActiveSpeaker?: boolean;
  cameraOff?: boolean;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      if (isLocal && stream) {
        videoRef.current.srcObject = stream;
      } else if (!isLocal && consumer?.track) {
        const remoteStream = new MediaStream([consumer.track]);
        videoRef.current.srcObject = remoteStream;
      }
    }
  }, [stream, consumer, isLocal]);

  // Role Badge Color
  const getRoleBadge = (r?: string) => {
    if (r === 'omni') return { color: 'bg-purple-500', label: 'Omni' };
    if (r === 'org_admin') return { color: 'bg-blue-500', label: 'Admin' };
    if (r === 'crew') return { color: 'bg-zinc-500', label: 'Crew' };
    return null;
  };
  const badge = getRoleBadge(role);

  return (
    <div className={cn(
      "relative w-full h-full bg-zinc-900 rounded-2xl overflow-hidden shadow-elevated border transition-all duration-300 group",
      isActiveSpeaker ? "border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]" : "border-white/10"
    )}>
      {/* Video / Avatar */}
      {!cameraOff ? (
        <video
          ref={videoRef}
          autoPlay
          muted={isLocal} // Always mute local video to prevent echo
          playsInline
          className={cn(
            "w-full h-full object-cover transition-transform duration-500",
            mirror && "scale-x-[-1]"
          )}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
          <Avatar className="w-24 h-24 text-4xl shadow-xl">
            <AvatarFallback className={cn(
              "text-white font-semibold",
              isActiveSpeaker ? "bg-green-600 animate-pulse" : "bg-zinc-700"
            )}>
              {name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Mic Indicator & Active Pulse (Ring) */}
      {isActiveSpeaker && (
        <div className="absolute inset-0 border-4 border-green-500/50 rounded-2xl animate-pulse pointer-events-none" />
      )}

      {/* Overlay: Name + Badges (Bottom Left) */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 max-w-[90%]">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/5 shadow-sm">
          {/* Mic Status Icon */}
          {isMuted ? (
            <MicOff className="w-3.5 h-3.5 text-red-400" />
          ) : isActiveSpeaker ? (
            <div className="flex gap-0.5 items-end h-3.5">
              <div className="w-1 bg-green-500 animate-[bounce_1s_infinite] h-2/3" />
              <div className="w-1 bg-green-500 animate-[bounce_1.2s_infinite] h-full" />
              <div className="w-1 bg-green-500 animate-[bounce_0.8s_infinite] h-1/2" />
            </div>
          ) : (
            <Mic className="w-3.5 h-3.5 text-white/70" />
          )}

          <span className="text-white text-[13px] font-medium truncate leading-tight tracking-wide">
            {name || 'Participant'} {isLocal && '(You)'}
          </span>
        </div>

        {/* Role Badge */}
        {badge && (
          <span className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider text-white shadow-sm",
            badge.color
          )}>
            {badge.label}
          </span>
        )}
      </div>

      {/* Audio Element for Remote */}
      {!isLocal && consumer?.kind !== 'video' && (
        <audio ref={videoRef as any} autoPlay />
      )}
    </div>
  );
};

const MeetingRoom = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { currentWorkspace, user } = useApp();

  // State
  const [phase, setPhase] = useState<MeetingPhase>('pre-join');
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  // Media State & Mediasoup
  const {
    device,
    consumers,
    joinRoom,
    produce,
    stopProducer,
  } = useMediasoup({ meetingId: meetingId!, user });

  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [selectedMic, setSelectedMic] = useState<string>('');
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [consentRecording, setConsentRecording] = useState(false);
  const [consentTranscription, setConsentTranscription] = useState(false);

  // In-meeting Controls
  const [screenSharing, setScreenSharing] = useState(false);
  const [showSidebar, setShowSidebar] = useState<'participants' | 'chat' | null>(null);
  const [layout, setLayout] = useState<'grid' | 'speaker'>('grid');


  // Realtime State
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [participantsList, setParticipantsList] = useState<ParticipantState[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // UI Disappears implementation
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    // Only auto-hide if sidebar is NOT open
    if (!showSidebar) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  useEffect(() => {
    // If sidebar opens, keep controls shown
    if (showSidebar) {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    } else {
      resetControlsTimeout();
    }
  }, [showSidebar]);

  useEffect(() => {
    const handleActivity = () => resetControlsTimeout();

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [showSidebar]);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  // Replaced ref with state to ensure UI updates
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // Summary Data
  const [summary, setSummary] = useState<any>(null);
  const [actionItems, setActionItems] = useState<any[]>([]);

  // Fetch Meeting Data
  useEffect(() => {
    if (meetingId && currentWorkspace) {
      fetchMeeting();
    }
  }, [meetingId, currentWorkspace]);

  // Refs for socket listeners to avoid re-subscription
  const showSidebarRef = useRef(showSidebar);
  const userRef = useRef(user);

  useEffect(() => {
    showSidebarRef.current = showSidebar;
  }, [showSidebar]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Handle Socket Events for Participant Updates
  useEffect(() => {
    if (phase === 'in-meeting' && meetingId) {
      socketClient.emit('meeting:join', meetingId); // Presence

      const handleUpdate = () => {
        fetchMeeting();
      };

      // Define handlers
      const handleSyncParticipants = ({ participants }: { participants: ParticipantState[] }) => {
        setParticipantsList(participants);
      };

      const handleParticipantJoined = ({ participant }: { participant: ParticipantState }) => {
        setParticipantsList(prev => {
          if (prev.find(p => p.userId === participant.userId)) return prev;
          return [...prev, participant];
        });
        const roleLabel = participant.role === 'org_admin' ? 'Admin' : participant.role === 'omni' ? 'Omni' : 'Crew';
        toast.info(`${participant.name} joined`, {
          description: `Role: ${roleLabel}`,
          icon: <Users className="w-4 h-4 text-primary" />
        });
      };

      const handleParticipantLeft = ({ userId }: { userId: string }) => {
        setParticipantsList(prev => prev.filter(p => p.userId !== userId));
        toast.info(`Participant left`);
      };

      const handleParticipantUpdated = ({ userId, state }: { userId: string, state: ParticipantState }) => {
        setParticipantsList(prev => prev.map(p => p.userId === userId ? state : p));
      };

      const handleChatMessage = (msg: ChatMessage) => {
        setChatMessages(prev => {
          // Deduplication check
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });

        // Use Ref for current state check
        if (showSidebarRef.current !== 'chat' && msg.senderId !== userRef.current?._id) {
          toast.message(`New message from ${msg.senderName}`, { description: msg.text });
        }
      };

      const handleActiveSpeaker = ({ userId }: { userId: string }) => {
        setActiveSpeakerId(userId || null);
      };

      const handleMeetingEnded = () => {
        toast.info('Meeting ended by host');
        setPhase('ended');
      };

      // Register listeners
      socketClient.on('meeting:participant-joined', handleParticipantJoined);
      socketClient.on('meeting:participant-left', handleParticipantLeft);
      socketClient.on('meeting:ended', handleMeetingEnded);
      socketClient.on('meeting:active-speaker', handleActiveSpeaker);
      socketClient.on('meeting:sync-participants', handleSyncParticipants);
      socketClient.on('meeting:participant-updated', handleParticipantUpdated);
      socketClient.on('meeting:chat-message', handleChatMessage);

      // Cleanup
      return () => {
        socketClient.off('meeting:participant-joined');
        socketClient.off('meeting:participant-left');
        socketClient.off('meeting:ended');
        socketClient.off('meeting:active-speaker');
        socketClient.off('meeting:sync-participants');
        socketClient.off('meeting:participant-updated');
        socketClient.off('meeting:chat-message');
      };
    }
  }, [phase, meetingId]); // Removed showSidebar from dependencies

  // Scroll to bottom of chat
  useEffect(() => {
    if (showSidebar === 'chat' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, showSidebar]);

  // Sync local state changes to backend
  useEffect(() => {
    if (phase === 'in-meeting' && meetingId) {
      socketClient.emit('meeting:update-state', {
        meetingId,
        state: {
          micOn: micEnabled,
          cameraOn: cameraEnabled,
          screenSharing: screenSharing
        }
      });
    }
  }, [micEnabled, cameraEnabled, screenSharing, phase, meetingId]);

  // Video Preview Effect
  useEffect(() => {
    const startPreview = async () => {
      // Allow getting media even if cameraEnabled is false initially so we can mute it?
      // Actually standard behavior is: if cam off, don't ask for video permission yet or stop video track.
      // But we need stream object for Mic at least.

      if (phase !== 'pre-join') return;

      try {
        if (localStream) {
          localStream.getTracks().forEach(t => t.stop());
        }

        if (!micEnabled && !cameraEnabled) {
          setLocalStream(null);
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: micEnabled ? { deviceId: selectedMic } : false,
          video: cameraEnabled ? { deviceId: selectedCamera } : false
        });

        setLocalStream(stream);
      } catch (err) {
        console.error('Failed to get media:', err);
        toast.error('Failed to access camera/microphone');
      }
    };

    startPreview();

    return () => {
      // We don't stop tracks here so they persist into the meeting
    };
  }, [micEnabled, cameraEnabled, selectedMic, selectedCamera, phase]);

  // Attach stream to pre-join video element
  useEffect(() => {
    if (phase === 'pre-join' && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, phase]);

  const fetchMeeting = async () => {
    if (!meetingId) return;
    try {
      const data = await apiClient.getMeeting(meetingId);
      setMeeting(data);
      if (data.status === 'ended') {
        setPhase('ended');
        if (data.aiSummaryId) fetchSummary(data.aiSummaryId);
      }
      setLoading(false);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load meeting');
      navigate('/app/meetings');
    }
  };

  const fetchSummary = async (summaryId: string) => {
    if (!currentWorkspace) return;
    try {
      const data = await apiClient.getAIContextDoc(currentWorkspace._id, summaryId);
      setSummary({ text: data.text });
      setActionItems(data.metadata?.actionItems || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleJoin = async () => {
    if (!meetingId || !meeting) return;
    try {
      setJoining(true);

      // 1. Backend Join (Get keys/tokens)
      const joinData = await apiClient.joinMeeting(meetingId, {
        recording: consentRecording,
        transcription: consentTranscription
      });

      // 2. Mediasoup Join
      await joinRoom(joinData);

      // 3. Produce Local Media
      if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        const videoTrack = localStream.getVideoTracks()[0];

        if (audioTrack && micEnabled) await produce(audioTrack, 'audio');
        if (videoTrack && cameraEnabled) await produce(videoTrack, 'video');
      }

      setPhase('in-meeting');
      toast.success(`Joined ${meeting.title}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to join meeting');
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
    }

    // Exit fullscreen
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(err => console.error(err));
    }

    if (meetingId) await apiClient.leaveMeeting(meetingId);
    navigate('/app/meetings'); // Return to dashboard
  };

  const toggleMic = async () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !micEnabled;
        setMicEnabled(!micEnabled);
      }
    }
  };

  const toggleCam = async () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !cameraEnabled;
        setCameraEnabled(!cameraEnabled);
      }
    }
  };

  if (loading || !meeting) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // --- PRE-JOIN ---
  if (phase === 'pre-join') {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex flex-col items-center justify-center p-6 relative">

        {/* Card */}
        <div className="w-full max-w-[500px] bg-white rounded-[24px] shadow-xl border border-white/40 p-2 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300">

          {/* Video Preview Area */}
          <div className="relative aspect-video bg-zinc-900 rounded-[20px] overflow-hidden group shadow-inner">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={cn("w-full h-full object-cover mirror", !cameraEnabled && "hidden")}
              style={{ transform: 'scaleX(-1)' }} // Mirror effect
            />
            {!cameraEnabled && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 gap-3">
                <VideoOff className="w-12 h-12 opacity-50" />
                <span className="text-sm font-medium">Camera is off</span>
              </div>
            )}

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/30 backdrop-blur-md p-1.5 rounded-full border border-white/10">
              <Button
                variant={micEnabled ? "secondary" : "destructive"}
                size="icon"
                className={cn("h-10 w-10 rounded-full transition-all", micEnabled ? "bg-white text-black hover:bg-gray-200" : "bg-red-500 hover:bg-red-600 text-white")}
                onClick={() => setMicEnabled(!micEnabled)}
              >
                {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </Button>
              <Button
                variant={cameraEnabled ? "secondary" : "destructive"}
                size="icon"
                className={cn("h-10 w-10 rounded-full transition-all", cameraEnabled ? "bg-white text-black hover:bg-gray-200" : "bg-red-500 hover:bg-red-600 text-white")}
                onClick={() => setCameraEnabled(!cameraEnabled)}
              >
                {cameraEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              </Button>
              <DeviceSelector
                selectedMic={selectedMic}
                selectedCamera={selectedCamera}
                onMicChange={setSelectedMic}
                onCameraChange={setSelectedCamera}
                trigger={
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-white hover:bg-white/20">
                    <Settings className="w-4 h-4" />
                  </Button>
                }
              />
            </div>
          </div>

          {/* Info & Join */}
          <div className="px-6 pb-6 pt-2 text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">{meeting.title}</h1>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Avatar className="w-5 h-5 border border-white shadow-sm">
                  <AvatarFallback className="text-[9px] bg-primary text-white">{meeting.organizer.name[0]}</AvatarFallback>
                </Avatar>
                <span>{meeting.organizer.name} is hosting</span>
                <span className="w-1 h-1 bg-gray-300 rounded-full" />
                <span>{meeting.participants.length} invited</span>
              </div>
            </div>

            {/* Consent */}
            {(meeting.recordingIds.length > 0 || meeting.status === 'in_progress') && (
              <div className="text-left bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                <div className="flex gap-3 items-start">
                  <Checkbox id="rec" checked={consentRecording} onCheckedChange={(c) => setConsentRecording(c === true)} />
                  <Label htmlFor="rec" className="text-sm font-medium leading-tight cursor-pointer">
                    I understand this meeting may be recorded.
                  </Label>
                </div>
                <div className="flex gap-3 items-start">
                  <Checkbox id="trans" checked={consentTranscription} onCheckedChange={(c) => setConsentTranscription(c === true)} />
                  <Label htmlFor="trans" className="text-sm font-medium leading-tight cursor-pointer">
                    I consent to AI transcription for notes.
                  </Label>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 w-full">
              <Button variant="ghost" className="flex-1 h-12 rounded-xl" onClick={() => navigate('/app/meetings')}>
                Cancel
              </Button>
              <Button
                className="flex-[2] h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/25"
                onClick={handleJoin}
                disabled={joining}
              >
                {joining ? <Loader2 className="w-5 h-5 animate-spin" /> : "Join Meeting"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- IN-MEETING ---
  if (phase === 'in-meeting') {
    // Layout logic moved inside render for dynamic variables

    return (
      <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col group/ui">
        {/* Header - Auto hide */}
        <div className={cn(
          "absolute top-0 left-0 right-0 z-50 p-6 transition-transform duration-300 ease-in-out",
          showControls ? "translate-y-0" : "-translate-y-full"
        )}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-white font-medium text-lg drop-shadow-md">{meeting?.title}</h1>
              <p className="text-white/60 text-sm drop-shadow-md">
                {meeting?.startTime ? format(new Date(), 'h:mm a') : ''} • {participantsList.length} Participants
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 rounded-full h-8 w-8"
                onClick={() => {
                  if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen();
                  } else {
                    document.exitFullscreen();
                  }
                }}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
              <Badge variant="outline" className="bg-black/20 backdrop-blur-md border-white/10 text-white cursor-pointer hover:bg-black/40 transition-colors">
                <Users className="w-3.5 h-3.5 mr-1.5" />
                {participantsList.length}
              </Badge>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-zinc-900 border-zinc-800 text-white">
                  <DropdownMenuItem onClick={() => setLayout('grid')} className="focus:bg-white/10 focus:text-white cursor-pointer">
                    <LayoutGrid className="w-4 h-4 mr-2" /> Grid View
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLayout('speaker')} className="focus:bg-white/10 focus:text-white cursor-pointer">
                    <Maximize2 className="w-4 h-4 mr-2" /> Speaker View
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Video Area */}
        <div className="flex-1 p-4 overflow-hidden relative">
          {(() => {
            const screenConsumer = Array.from(consumers.values()).find(c => c.kind === 'video' && c.appData?.source === 'screen');
            const isLocalScreenSharing = screenSharing;
            const isPresenting = isLocalScreenSharing || !!screenConsumer;

            // Filter out remote screen share from regular video grid to avoid duplication if we handle it separately
            // const regularVideoConsumers = Array.from(consumers.values()).filter(c => c.kind === 'video' && c.appData?.source !== 'screen');
            const totalRegular = participantsList.length; // Includes local user usually if they are in the list, but let's check
            // Actually participantsList includes everyone provided by 'meeting:sync-participants' or 'join'.
            // If local user is in participantsList, then totalRegular = participantsList.length. 
            // If local user is NOT in participantsList (often is), we need to check.
            // Usually participantsList includes self. Let's assume yes based on previous code usage finding `user._id`.

            if (isPresenting) {
              // --- SPOTLIGHT LAYOUT ---
              return (
                <div className="w-full h-full flex flex-col md:flex-row gap-4">
                  {/* Main Stage (Screen) */}
                  <div className="flex-1 bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 relative shadow-2xl">
                    {isLocalScreenSharing ? (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                        <div className="text-center">
                          <Monitor className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse" />
                          <h3 className="text-xl font-medium text-white">You are sharing your screen</h3>
                          <Button variant="destructive" className="mt-4" onClick={async () => {
                            await stopProducer('screen');
                            setScreenSharing(false);
                          }}>Stop Sharing</Button>
                        </div>
                      </div>
                    ) : (
                      screenConsumer && (
                        <div className="w-full h-full">
                          {/* Use a simple video tag for screen share, VideoTile might be overkill or needs tweaks */}
                          <VideoTile
                            consumer={screenConsumer}
                            participantId={screenConsumer.id}
                            name="Presentation"
                            isActiveSpeaker={false}
                          />
                        </div>
                      )
                    )}
                    <div className="absolute top-4 left-4 bg-primary px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg">
                      {isLocalScreenSharing ? 'You are presenting' : 'Presentation'}
                    </div>
                  </div>

                  {/* Filmstrip (Sidebar) */}
                  <div className="h-32 md:h-full md:w-64 flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto shrink-0 custom-scrollbar">
                    {/* Local Camera */}
                    <div className="aspect-video md:aspect-auto md:h-48 shrink-0 relative">
                      <VideoTile
                        isLocal
                        name={user?.name}
                        mirror
                        stream={localStream}
                        cameraOff={!cameraEnabled}
                        isMuted={!micEnabled}
                        isActiveSpeaker={activeSpeakerId === user?._id}
                        role={currentWorkspace?.role} // Pass role
                      />
                    </div>

                    {/* Remote Cameras */}
                    {/* Remote Cameras */}
                    {participantsList.filter(p => p.userId !== user?._id).map(p => {
                      const videoConsumer = Array.from(consumers.values()).find(c =>
                        c.participantId === p.userId &&
                        c.kind === 'video' &&
                        c.appData?.source !== 'screen'
                      );

                      return (
                        <div key={p.userId} className="aspect-video md:aspect-auto md:h-48 shrink-0 relative">
                          <VideoTile
                            consumer={videoConsumer}
                            participantId={p.userId}
                            name={p.name}
                            role={p.role}
                            isActiveSpeaker={activeSpeakerId === p.userId}
                            isMuted={!p.micOn}
                            cameraOff={!videoConsumer}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            } else {
              // --- GRID LAYOUT ---

              if (totalRegular === 1) {
                // SINGLE VIEW (Flexbox for centering) - No Stretch
                return (
                  <div className="w-full h-full flex items-center justify-center p-4">
                    {/* Constrain max width to avoid banner look */}
                    <div className="relative w-full max-w-5xl aspect-video shadow-2xl">
                      <VideoTile
                        isLocal
                        name={user?.name}
                        mirror
                        stream={localStream}
                        cameraOff={!cameraEnabled}
                        isMuted={!micEnabled}
                        isActiveSpeaker={activeSpeakerId === user?._id}
                        role={currentWorkspace?.role}
                      />
                    </div>
                  </div>
                );
              }

              // MULTI VIEW (Grid)
              let gridClass = "grid-cols-1 md:grid-cols-2";
              if (totalRegular >= 3) gridClass = "md:grid-cols-2 lg:grid-cols-3";
              if (totalRegular >= 5) gridClass = "md:grid-cols-3 lg:grid-cols-4";
              if (totalRegular >= 9) gridClass = "md:grid-cols-3 lg:grid-cols-5"; // denser grid for many users

              return (
                <div className={cn("grid gap-4 w-full h-full content-center p-4", gridClass)}>
                  {/* Local Video */}
                  <div className="relative w-full h-full min-h-[200px]">
                    <VideoTile
                      isLocal
                      name={user?.name}
                      mirror
                      stream={localStream}
                      cameraOff={!cameraEnabled}
                      isMuted={!micEnabled}
                      isActiveSpeaker={activeSpeakerId === user?._id}
                      role={currentWorkspace?.role}
                    />
                  </div>

                  {/* Remote Videos */}
                  {/* Remote Videos */}
                  {participantsList.filter(p => p.userId !== user?._id).map(p => {
                    const videoConsumer = Array.from(consumers.values()).find(c =>
                      c.participantId === p.userId &&
                      c.kind === 'video' &&
                      c.appData?.source !== 'screen'
                    );

                    return (
                      <div key={p.userId} className="relative w-full h-full min-h-[200px]">
                        <VideoTile
                          consumer={videoConsumer}
                          participantId={p.userId}
                          name={p.name}
                          role={p.role}
                          isActiveSpeaker={activeSpeakerId === p.userId}
                          isMuted={!p.micOn}
                          cameraOff={!videoConsumer}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            }
          })()}
        </div>

        {/* Sidebar (Overlay) */}
        {showSidebar && (
          <div className="absolute right-4 top-20 bottom-24 w-[300px] bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-0 shadow-2xl z-40 flex flex-col animate-in slide-in-from-right-10 duration-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
              <h3 className="font-bold text-sm text-white capitalize tracking-wide">{showSidebar}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowSidebar(null)} className="h-6 w-6 hover:bg-white/10 rounded-full text-white">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
            {/* Participants List */}
            {
              showSidebar === 'participants' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {participantsList.map((p) => (
                    <div key={p.userId} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 border border-white/10">
                          <AvatarFallback className={p.userId === user?._id ? "bg-primary text-white text-xs" : "bg-zinc-700 text-zinc-300 text-xs"}>
                            {p.name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold leading-none text-white">
                              {p.name} {p.userId === user?._id && "(You)"}
                            </p>
                            {/* Role Badge */}
                            {p.role === 'org_admin' && <span className="text-[9px] px-1 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30">Admin</span>}
                            {p.role === 'omni' && <span className="text-[9px] px-1 bg-purple-500/20 text-purple-300 rounded border border-purple-500/30">Omni</span>}
                          </div>
                          <p className="text-[10px] text-zinc-400 mt-0.5">
                            {p.role === 'crew' ? 'Crew Member' : p.role}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {p.micOn ? <Mic className="w-3.5 h-3.5 text-green-400" /> : <MicOff className="w-3.5 h-3.5 text-red-400/70" />}
                        {p.cameraOn ? <Video className="w-3.5 h-3.5 text-green-400" /> : <VideoOff className="w-3.5 h-3.5 text-red-400/70" />}
                      </div>
                    </div>
                  ))}
                </div>
              )
            }

            {/* Chat */}
            {
              showSidebar === 'chat' && (
                <div className="flex flex-col h-full bg-zinc-950/50">
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {chatMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-zinc-500/50">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-3 animate-bounce">
                          <span className="text-xl">👋</span>
                        </div>
                        <p className="text-sm font-medium text-zinc-400">Say hello!</p>
                        <p className="text-xs text-zinc-600">No messages yet.</p>
                      </div>
                    ) : (
                      chatMessages.map(msg => (
                        <div key={msg.id} className={`flex flex-col ${msg.senderId === user?._id ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm ${msg.senderId === user?._id
                            ? 'bg-primary text-white rounded-br-none'
                            : 'bg-zinc-800 text-zinc-100 rounded-bl-none border border-white/5'
                            }`}>
                            <p className={`font-bold text-[9px] mb-1 opacity-70 ${msg.senderId === user?._id ? 'text-blue-100' : 'text-zinc-400'}`}>{msg.senderName}</p>
                            {msg.text}
                          </div>
                          <span className="text-[9px] text-zinc-500 mt-1 px-1">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!chatInput.trim()) return;
                      socketClient.emit('meeting:chat-message', { meetingId, text: chatInput });
                      setChatInput('');
                    }}
                    className="p-3 border-t border-white/10 bg-zinc-900/80 backdrop-blur-md"
                  >
                    <div className="relative">
                      <Input
                        placeholder="Type a message..."
                        className="pr-10 h-10 bg-zinc-950/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-primary/50"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute right-1 top-1 h-8 w-8 hover:bg-white/10 text-primary hover:text-primary-foreground"
                        type="submit"
                        disabled={!chatInput.trim()}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </form>
                </div>
              )
            }
          </div>
        )}


        {/* Bottom Controls - Auto hide */}
        <div className={cn(
          "absolute bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-in-out",
          showControls ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
        )}>
          <div className="flex items-center gap-3 px-6 py-3 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl transition-transform duration-300 hover:scale-105">
            <Button
              variant={micEnabled ? "ghost" : "destructive"}
              size="icon"
              className={cn("h-12 w-12 rounded-full", micEnabled ? "hover:bg-white/20 text-white" : "")}
              onClick={toggleMic}
            >
              {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </Button>
            <Button
              variant={cameraEnabled ? "ghost" : "destructive"}
              size="icon"
              className={cn("h-12 w-12 rounded-full", cameraEnabled ? "hover:bg-white/20 text-white" : "")}
              onClick={toggleCam}
            >
              {cameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </Button>

            <div className="w-px h-8 bg-white/10 mx-1" />

            <Button
              variant={screenSharing ? "default" : "ghost"}
              size="icon"
              className={cn("h-12 w-12 rounded-full", screenSharing ? "bg-green-500 hover:bg-green-600 text-white" : "hover:bg-white/20 text-white")}
              onClick={async () => {
                if (screenSharing) {
                  await stopProducer('screen');
                  setScreenSharing(false);
                } else {
                  try {
                    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                    const track = stream.getVideoTracks()[0];
                    await produce(track, 'video', 'screen');
                    setScreenSharing(true);

                    // Handle browser "Stop Sharing" floating bar
                    track.onended = () => {
                      stopProducer('screen');
                      setScreenSharing(false);
                    };
                  } catch (e) {
                    console.error(e);
                  }
                }
              }}
            >
              <Monitor className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-12 w-12 rounded-full text-white transition-colors", showSidebar === 'participants' ? "bg-white/20 hover:bg-white/30" : "hover:bg-white/10")}
              onClick={() => setShowSidebar(showSidebar === 'participants' ? null : 'participants')}
            >
              <Users className="w-5 h-5" />
              {participantsList.length > 0 && (
                <span className="absolute top-2 right-2 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary text-[8px] items-center justify-center">{participantsList.length}</span>
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-12 w-12 rounded-full text-white transition-colors", showSidebar === 'chat' ? "bg-white/20 hover:bg-white/30" : "hover:bg-white/10")}
              onClick={() => setShowSidebar(showSidebar === 'chat' ? null : 'chat')}
            >
              <MessageSquare className="w-5 h-5" />
            </Button>

            <div className="w-px h-8 bg-white/10 mx-1" />

            <Button
              variant="destructive"
              size="icon"
              className="h-12 w-16 rounded-full bg-red-500 hover:bg-red-600 pl-1"
              onClick={handleLeave}
            >
              <PhoneOff className="w-6 h-6 fill-current" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // --- SUMMARY ---
  if (phase === 'ended' || phase === 'summary' || meeting.status === 'ended') {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex flex-col items-center justify-center p-6">
        <div className="bg-white max-w-3xl w-full rounded-[24px] shadow-sm border border-gray-200 p-10 space-y-8 animate-in fade-in zoom-in-95 duration-500">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Meeting Complete</h2>
            <p className="text-gray-500 text-lg">{meeting.title}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {meeting.participants.map(p => (
                <Badge key={p.userId} variant="secondary" className="rounded-md font-normal">
                  {p.user?.name}
                </Badge>
              ))}
            </div>
          </div>

          {summary ? (
            <div className="space-y-6">
              <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-semibold text-lg text-indigo-900">AI Summary</h3>
                </div>
                <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                  {summary.text}
                </div>
              </div>
            </div>
          ) : meeting.aiSummaryId ? (
            <div className="py-12 text-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              <p className="text-gray-500">Generating meeting insights...</p>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 italic">
              No summary available for this meeting.
            </div>
          )}

          <div className="flex items-center justify-center gap-4 pt-4 border-t border-gray-100">
            <Button variant="outline" className="h-11 px-8 rounded-xl" onClick={() => navigate('/app/meetings')}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
export default MeetingRoom;


