import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Users,
  Video,
  Loader2,
  Check,
  Zap,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useApp } from "@/contexts/AppContext";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

// Types
type MeetingType = 'standup' | 'planning' | 'review' | 'retrospective' | '1:1' | 'custom';
type MeetingProvider = 'zoom' | 'google_meet' | 'internal' | null;
type ParticipantRole = 'organizer' | 'host' | 'participant' | 'observer';
type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';

interface ScheduleMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onMeetingCreated?: (result?: { meetingId: string; meeting: any }) => void;
  mode?: 'schedule' | 'instant';
}

interface Member {
  _id: string;
  name: string;
  email?: string;
  role: string;
}

interface ParticipantWithRole {
  userId: string;
  role: ParticipantRole;
}

const MEETING_TYPES: { value: MeetingType; label: string }[] = [
  { value: 'standup', label: '🏃 Daily Standup' },
  { value: 'planning', label: '📋 Sprint Planning' },
  { value: 'review', label: '🔍 Sprint Review' },
  { value: 'retrospective', label: '💭 Retrospective' },
  { value: '1:1', label: '👥 1:1 Meeting' },
  { value: 'custom', label: '⚙️ Custom' },
];

const MEETING_PROVIDERS: { value: MeetingProvider; label: string; icon: string }[] = [
  { value: null, label: 'No Video Link', icon: '🚫' },
  { value: 'internal', label: 'Built-in Video', icon: '🎥' },
  { value: 'zoom', label: 'Zoom Meeting', icon: '📹' },
  { value: 'google_meet', label: 'Google Meet', icon: '🎦' },
];

const PARTICIPANT_ROLES: { value: ParticipantRole; label: string }[] = [
  { value: 'organizer', label: 'Organizer' },
  { value: 'host', label: 'Host' },
  { value: 'participant', label: 'Participant' },
  { value: 'observer', label: 'Observer' },
];

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: 'none', label: 'No Recurrence' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' },
];

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Singapore',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
];

export const ScheduleMeetingModal = ({
  open,
  onOpenChange,
  workspaceId,
  onMeetingCreated,
  mode = 'schedule',
}: ScheduleMeetingModalProps) => {
  const { user } = useApp();
  const isInstant = mode === 'instant';

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [agenda, setAgenda] = useState("");
  const [meetingType, setMeetingType] = useState<MeetingType>('custom');
  const [startTime, setStartTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [selectedParticipants, setSelectedParticipants] = useState<ParticipantWithRole[]>([]);
  const [record, setRecord] = useState(false);
  const [meetingProvider, setMeetingProvider] = useState<MeetingProvider>(null);
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [timezone, setTimezone] = useState<string>(() => {
    // Get browser timezone or default to UTC
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'UTC';
    }
  });
  const [recordingConsent, setRecordingConsent] = useState(false);
  const [transcriptionConsent, setTranscriptionConsent] = useState(false);

  // UI state
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Initialize defaults when modal opens
  useEffect(() => {
    if (open) {
      if (isInstant) {
        // Pre-fill for instant meeting
        setTitle("Quick Sync");
        setAgenda("Instant meeting");
        setDurationMinutes(30);
        setMeetingType('custom');
        // Default to internal video for instant
        setMeetingProvider('internal');
      } else {
        // Reset for scheduled meeting
        resetForm();
      }

      if (workspaceId) {
        fetchMembers();
      }
    }
  }, [open, isInstant, workspaceId]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAgenda("");
    setMeetingType('custom');
    setStartTime("");
    setDurationMinutes(30);
    setSelectedParticipants([]);
    setRecord(false);
    setMeetingProvider(null);
    setRecurrence('none');
    setRecordingConsent(false);
    setTranscriptionConsent(false);
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const result = await apiClient.getWorkspaceMembers(workspaceId);
      setMembers(result.members.filter((m: Member) => m._id !== user?._id));
    } catch (error: any) {
      console.error('Failed to load members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Meeting title is required');
      return;
    }

    try {
      setCreating(true);

      // For instant meetings, use current time
      const finalStartTime = isInstant
        ? new Date().toISOString()
        : (startTime ? new Date(startTime).toISOString() : undefined);

      // Calculate end time
      let endTime: string | undefined;
      if (finalStartTime) {
        const start = new Date(finalStartTime);
        const end = new Date(start.getTime() + durationMinutes * 60000);
        endTime = end.toISOString();
      }

      // Build participants array with roles
      const participantIds = selectedParticipants.map(p => ({
        userId: p.userId,
        role: p.role,
      }));

      const result = await apiClient.createMeeting(workspaceId, {
        title: title.trim(),
        description: description.trim() || undefined,
        agenda: agenda.trim() || undefined,
        meetingType,
        startTime: finalStartTime,
        endTime,
        durationMinutes,
        participants: participantIds,
        record,
        meetingProvider,
        recurrenceRule: recurrence !== 'none' ? recurrence : undefined,
        timezone,
        recordingConsent,
        transcriptionConsent,
      });

      toast.success(isInstant ? 'Meeting started!' : 'Meeting scheduled successfully');

      // Pass result back to parent
      onMeetingCreated?.(result);
      handleClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create meeting');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    if (!creating) {
      resetForm();
      onOpenChange(false);
    }
  };

  const toggleParticipant = (memberId: string) => {
    setSelectedParticipants((prev) => {
      const exists = prev.find(p => p.userId === memberId);
      if (exists) {
        return prev.filter((p) => p.userId !== memberId);
      } else {
        return [...prev, { userId: memberId, role: 'participant' as ParticipantRole }];
      }
    });
  };

  const updateParticipantRole = (memberId: string, role: ParticipantRole) => {
    setSelectedParticipants((prev) =>
      prev.map((p) => (p.userId === memberId ? { ...p, role } : p))
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto rounded-xl border-border shadow-elevated gap-0 p-0">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-b from-muted/30 to-transparent">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            {isInstant ? (
              <>
                <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                Start Instant Meeting
              </>
            ) : (
              <>
                <Calendar className="w-5 h-5 text-primary" />
                Schedule Meeting
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {isInstant
              ? 'Configure your meeting options and start immediately'
              : 'Plan a synced session with your team'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 p-6 pt-2">
          {/* Title & Agenda */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Meeting Title
              </Label>
              <Input
                id="title"
                placeholder="e.g. Weekly Design Sync"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11 font-medium text-base rounded-lg border-border focus-visible:ring-primary/20"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="agenda" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Agenda (optional)
              </Label>
              <Textarea
                id="agenda"
                placeholder="What's this meeting about?"
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                rows={2}
                className="resize-none rounded-lg border-border focus-visible:ring-primary/20"
              />
            </div>
          </div>

          {/* Meeting Type & Provider - Side by Side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Meeting Type
              </Label>
              <Select value={meetingType} onValueChange={(v) => setMeetingType(v as MeetingType)}>
                <SelectTrigger className="h-10 rounded-lg">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {MEETING_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Video Provider
              </Label>
              <Select
                value={meetingProvider ?? 'none'}
                onValueChange={(v) => setMeetingProvider(v === 'none' ? null : v as MeetingProvider)}
              >
                <SelectTrigger className="h-10 rounded-lg">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {MEETING_PROVIDERS.map((provider) => (
                    <SelectItem key={provider.value ?? 'none'} value={provider.value ?? 'none'}>
                      <span className="flex items-center gap-2">
                        <span>{provider.icon}</span>
                        <span>{provider.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Time & Duration - Only show for scheduled meetings */}
          {!isInstant && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="startTime" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  When
                </Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-10 rounded-lg border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="duration" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Duration
                </Label>
                <div className="relative">
                  <Input
                    id="duration"
                    type="number"
                    min="15"
                    step="15"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 30)}
                    className="h-10 rounded-lg border-border pr-12"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                    min
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Duration for Instant */}
          {isInstant && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Duration
              </Label>
              <div className="flex gap-2">
                {[15, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setDurationMinutes(mins)}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all border",
                      durationMinutes === mins
                        ? "bg-primary text-white border-primary"
                        : "bg-muted/50 hover:bg-muted border-border"
                    )}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recurrence & Timezone - Only show for scheduled meetings */}
          {!isInstant && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Recurrence
                </Label>
                <Select value={recurrence} onValueChange={(v) => setRecurrence(v as RecurrenceType)}>
                  <SelectTrigger className="h-10 rounded-lg">
                    <SelectValue placeholder="Select recurrence" />
                  </SelectTrigger>
                  <SelectContent>
                    {RECURRENCE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Timezone
                </Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="h-10 rounded-lg">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Participants */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Participants ({selectedParticipants.length} selected)
            </Label>
            <div className="border border-border rounded-lg max-h-40 overflow-auto bg-muted/10 p-1">
              {loading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : members.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center">
                  No other members in this workspace
                </p>
              ) : (
                <div className="space-y-1">
                  {members.map((member) => {
                    const participant = selectedParticipants.find(p => p.userId === member._id);
                    const isSelected = !!participant;
                    return (
                      <div
                        key={member._id}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-md transition-all",
                          isSelected ? "bg-primary/10" : "hover:bg-background"
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleParticipant(member._id)}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <Avatar className="w-6 h-6 border">
                          <AvatarFallback className={cn(
                            "text-[10px]",
                            isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                          )}>
                            {member.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className={cn(
                          "text-xs font-medium truncate flex-1",
                          isSelected ? "text-primary" : "text-foreground"
                        )}>
                          {member.name}
                        </span>
                        {isSelected && (
                          <Select
                            value={participant?.role || 'participant'}
                            onValueChange={(role) => updateParticipantRole(member._id, role as ParticipantRole)}
                          >
                            <SelectTrigger className="h-7 w-24 text-xs rounded">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PARTICIPANT_ROLES.map((role) => (
                                <SelectItem key={role.value} value={role.value}>
                                  {role.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recording Option */}
          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border border-border/50">
            <Checkbox
              id="record"
              checked={record}
              onCheckedChange={(checked) => setRecord(checked === true)}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <Label htmlFor="record" className="cursor-pointer text-sm font-medium flex-1">
              Automatically record and transcribe
            </Label>
          </div>
        </div>

        <DialogFooter className="p-6 pt-4 bg-muted/10 border-t border-border/50 gap-2">
          <Button variant="ghost" onClick={handleClose} disabled={creating} className="rounded-md h-10">
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleCreate}
            disabled={creating || !title.trim()}
            className={cn(
              "rounded-md h-10 px-6 shadow-md text-white",
              isInstant
                ? "bg-amber-500 hover:bg-amber-600"
                : "bg-primary hover:bg-primary/90"
            )}
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isInstant ? 'Starting...' : 'Scheduling...'}
              </>
            ) : isInstant ? (
              <>
                <Video className="w-4 h-4 mr-2" />
                Start Now
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Meeting
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
