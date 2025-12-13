import { useState, useEffect } from "react";
import {
  Video,
  Plus,
  Calendar,
  Clock,
  Users,
  Play,
  Square,
  Loader2,
  MoreVertical,
  Eye,
  Trash2,
  Link,
  Share2,
  Zap
} from "lucide-react";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import { apiClient } from "@/lib/api";
import { socketClient } from "@/lib/socket";
import { toast } from "sonner";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { ScheduleMeetingModal } from "@/components/meetings/ScheduleMeetingModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Meeting {
  _id: string;
  title: string;
  agenda?: string;
  organizer: { name: string; email: string };
  status: 'scheduled' | 'in_progress' | 'ended' | 'cancelled' | 'upcoming';
  startTime: string | null;
  endTime: string | null;
  participants: Array<{ userId: string; joinedAt: string | null; consent: any }>;
  createdAt: string;
  recordingIds: string[];
  aiSummaryId?: string;
}

const Meetings = () => {
  const { currentWorkspace, user } = useApp();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [loading, setLoading] = useState(true);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [startingInstant, setStartingInstant] = useState(false);

  useEffect(() => {
    if (currentWorkspace) {
      fetchMeetings();

      const handleMeetingUpdate = () => {
        fetchMeetings();
      };

      socketClient.on('meeting:created', handleMeetingUpdate);
      socketClient.on('meeting:started', handleMeetingUpdate);
      socketClient.on('meeting:ended', handleMeetingUpdate);
      socketClient.on('meeting:joined', handleMeetingUpdate);

      return () => {
        socketClient.off('meeting:created', handleMeetingUpdate);
        socketClient.off('meeting:started', handleMeetingUpdate);
        socketClient.off('meeting:ended', handleMeetingUpdate);
        socketClient.off('meeting:joined', handleMeetingUpdate);
      };
    }
  }, [currentWorkspace, filter]);

  const fetchMeetings = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      const result = await apiClient.getMeetings(
        currentWorkspace._id,
        filter === 'all' ? undefined : filter
      );
      setMeetings(result);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const handleStartInstant = async () => {
    if (!currentWorkspace) return;
    try {
      setStartingInstant(true);
      const { meetingId } = await apiClient.createMeeting(currentWorkspace._id, {
        title: "Quick Sync",
        agenda: "Instant meeting",
        startTime: new Date().toISOString(),
        durationMinutes: 30,
        record: false
      });

      // Auto-start
      await apiClient.startMeeting(meetingId);

      // Navigate to room
      navigate(`/meeting/${meetingId}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to start instant meeting');
    } finally {
      setStartingInstant(false);
    }
  };

  const handleJoin = (meetingId: string) => {
    navigate(`/meeting/${meetingId}`);
  };

  const handleStart = async (meetingId: string) => {
    try {
      await apiClient.startMeeting(meetingId);
      toast.success('Meeting started');
      navigate(`/meeting/${meetingId}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to start meeting');
    }
  };

  const handleEnd = async (meetingId: string) => {
    try {
      await apiClient.endMeeting(meetingId);
      toast.success('Meeting ended');
      fetchMeetings();
      setSelectedMeeting(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to end meeting');
    }
  };

  const handleDelete = async (meetingId: string) => {
    if (!window.confirm('Are you sure you want to delete this meeting?')) return;
    try {
      await apiClient.deleteMeeting(meetingId);
      toast.success('Meeting deleted');
      fetchMeetings();
      if (selectedMeeting?._id === meetingId) {
        setSelectedMeeting(null);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete meeting');
    }
  };

  const isOrganizer = (meeting: Meeting) => {
    return meeting.organizer.email.toLowerCase().trim() === user?.email?.toLowerCase().trim();
  };

  const canManage = (meeting: Meeting) => {
    return isOrganizer(meeting) || currentWorkspace?.role === 'omni' || currentWorkspace?.role === 'org_admin';
  };

  if (!currentWorkspace) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto flex items-center justify-center h-full">
        <p className="text-muted-foreground">Please select a workspace</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 h-full flex flex-col max-w-[1600px] mx-auto w-full bg-background/50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10 shrink-0">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-2">Meetings</h1>
          <p className="text-muted-foreground text-sm font-medium">Coordinate, iterate, and move work forward.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleStartInstant}
            disabled={startingInstant}
            className="rounded-md h-10 px-4 font-medium border-border hover:bg-white hover:text-primary transition-colors shadow-sm"
          >
            {startingInstant ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2 fill-current" />}
            Instant Meeting
          </Button>
          <Button
            variant="default"
            onClick={() => setScheduleOpen(true)}
            className="rounded-md h-10 px-4 font-medium shadow-elevated hover:translate-y-[-1px] transition-all bg-primary text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Schedule Meeting
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-8 shrink-0 border-b border-border pb-1">
        {['upcoming', 'past', 'all'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={cn(
              "px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all relative top-[1px]",
              filter === f
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Meetings Grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : meetings.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto py-12">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="font-semibold text-lg mb-2 text-foreground">No meetings found</h3>
            <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
              {filter === 'upcoming'
                ? 'Your schedule is clear. Create a meeting to sync with your team.'
                : 'No meetings match your selected filter.'}
            </p>
            {filter === 'upcoming' && (
              <Button variant="outline" onClick={() => setScheduleOpen(true)} className="rounded-md">
                Schedule Meeting
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 overflow-y-auto pb-8 pr-2">
          {meetings.map((meeting) => (
            <div
              key={meeting._id}
              className="group bg-card hover:bg-card/80 rounded-lg border border-border shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-soft transition-all duration-200 flex flex-col p-5 relative cursor-pointer"
              onClick={() => setSelectedMeeting(meeting)}
            >
              {/* Header: Status + Menu */}
              <div className="flex items-start justify-between mb-4">
                <Badge
                  variant="secondary"
                  className={cn(
                    "px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase border border-border/50",
                    meeting.status === 'in_progress' ? "bg-green-50 text-green-700 border-green-100" :
                      meeting.status === 'ended' ? "bg-gray-50 text-gray-500" :
                        "bg-blue-50 text-blue-600 border-blue-100"
                  )}
                >
                  {meeting.status === 'in_progress' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />}
                  {meeting.status === 'in_progress' ? 'Live' :
                    meeting.status === 'ended' ? 'Done' :
                      'Scheduled'}
                </Badge>

                {/* Indicators */}
                <div className="flex items-center gap-1 ml-auto mr-2">
                  {meeting.recordingIds?.length > 0 && (
                    <div className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center" title="Recorded">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                    </div>
                  )}
                  {meeting.aiSummaryId && (
                    <div className="w-5 h-5 rounded-full bg-purple-50 flex items-center justify-center" title="Summary Ready">
                      <Zap className="w-3 h-3 text-purple-600 fill-current" />
                    </div>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-md -mr-1">
                      <MoreVertical className="w-3.5 h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 rounded-lg shadow-lg border-border">
                    <DropdownMenuItem onClick={() => setSelectedMeeting(meeting)}>
                      <Eye className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                      View Details
                    </DropdownMenuItem>
                    {canManage(meeting) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                          onSelect={() => handleDelete(meeting._id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Body: Title */}
              <div className="mb-6 flex-1">
                <h3 className="text-[15px] font-semibold text-foreground leading-snug line-clamp-2 mb-1" title={meeting.title}>
                  {meeting.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {meeting.agenda || 'No agenda'}
                </p>
              </div>

              {/* Footer: Date & Host */}
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium text-foreground">
                    {meeting.startTime ? format(new Date(meeting.startTime), 'MMM d, h:mm a') : 'TBD'}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {meeting.organizer.name.split(' ')[0]}
                  </span>
                </div>

                <Avatar className="w-7 h-7 border border-border">
                  <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground font-medium">
                    {meeting.organizer.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Modal */}
      {currentWorkspace && (
        <ScheduleMeetingModal
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          workspaceId={currentWorkspace._id}
          onMeetingCreated={() => {
            fetchMeetings();
            setScheduleOpen(false);
          }}
        />
      )}

      {/* Meeting Details Modal */}
      <Dialog open={!!selectedMeeting} onOpenChange={(open) => !open && setSelectedMeeting(null)}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-xl border-border shadow-elevated gap-0">
          {selectedMeeting && (
            <div className="flex flex-col">
              {/* Header */}
              <div className="p-8 pb-6 bg-muted/30 border-b border-border/50">
                <div className="flex items-center gap-3 mb-4">
                  <Badge variant="outline" className={cn(
                    "rounded-md px-2 py-1 font-medium border text-xs",
                    selectedMeeting.status === 'in_progress' ? "bg-green-50 text-green-700 border-green-200" :
                      "bg-white text-muted-foreground border-border"
                  )}>
                    {selectedMeeting.status === 'in_progress' ? 'Live Now' : selectedMeeting.status === 'ended' ? 'Ended' : 'Scheduled'}
                  </Badge>
                  {selectedMeeting.status === 'in_progress' && (
                    <span className="text-xs text-green-600 font-medium animate-pulse">Happening now</span>
                  )}
                </div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">{selectedMeeting.title}</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">{selectedMeeting.agenda || 'No agenda provided for this meeting.'}</p>
              </div>

              {/* Details */}
              <div className="p-8 grid grid-cols-2 gap-y-6 gap-x-8">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date & Time</label>
                  <p className="text-sm font-medium text-foreground">
                    {selectedMeeting.startTime ? format(new Date(selectedMeeting.startTime), 'EEEE, MMMM d') : 'TBD'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedMeeting.startTime ? format(new Date(selectedMeeting.startTime), 'h:mm a') : ''}
                    {selectedMeeting.endTime && ` - ${format(new Date(selectedMeeting.endTime), 'h:mm a')}`}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Organizer</label>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-5 h-5">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {selectedMeeting.organizer.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{selectedMeeting.organizer.name}</span>
                  </div>
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Participants ({selectedMeeting.participants?.length || 0})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedMeeting.participants?.length > 0 ? (
                      selectedMeeting.participants.map((p, i) => (
                        <Badge key={i} variant="secondary" className="rounded-md font-normal text-muted-foreground bg-secondary/50">
                          Participant {i + 1}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground italic">No other participants</span>
                    )}
                  </div>
                </div>

                {/* Links / Share */}
                <div className="col-span-2 pt-4 border-t border-border flex items-center gap-4">
                  <div className="flex-1 bg-muted/30 rounded-lg p-2 flex items-center gap-2 border border-border/50">
                    <Link className="w-4 h-4 text-muted-foreground ml-1" />
                    <Input
                      readOnly
                      className="h-7 border-0 bg-transparent text-xs text-muted-foreground focus-visible:ring-0 px-1"
                      value={`${window.location.origin}/meeting/${selectedMeeting._id}`}
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/meeting/${selectedMeeting._id}`);
                      toast.success("Link copied");
                    }}>
                      <Share2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="w-10 h-10 bg-white p-1 rounded-lg border border-border flex items-center justify-center">
                    <QRCode
                      value={`${window.location.origin}/meeting/${selectedMeeting._id}`}
                      size={32}
                      style={{ width: "100%", height: "auto" }}
                    />
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-8 pt-0 flex flex-col gap-3">
                {selectedMeeting.status === 'in_progress' ? (
                  <Button className="w-full h-11 rounded-md text-base" onClick={() => handleJoin(selectedMeeting._id)}>
                    Join Meeting
                  </Button>
                ) : canManage(selectedMeeting) && selectedMeeting.status !== 'ended' ? (
                  <Button className="w-full h-11 rounded-md text-base" onClick={() => handleStart(selectedMeeting._id)}>
                    Start Meeting
                  </Button>
                ) : selectedMeeting.status === 'ended' ? (
                  <Button variant="outline" className="w-full h-11 rounded-md" onClick={() => navigate(`/meeting/${selectedMeeting._id}`)}>
                    View Summary
                  </Button>
                ) : (
                  <Button variant="secondary" className="w-full h-11 rounded-md" disabled>
                    Waiting for host...
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Meetings;
