import { useState, useEffect } from "react";
import { Calendar, Clock, Users, FileText, Video, Loader2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useApp } from "@/contexts/AppContext";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

interface ScheduleMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onMeetingCreated?: () => void;
}

interface Member {
  _id: string;
  name: string;
  email?: string;
  role: string;
}

export const ScheduleMeetingModal = ({
  open,
  onOpenChange,
  workspaceId,
  onMeetingCreated,
}: ScheduleMeetingModalProps) => {
  const { user } = useApp();
  const [title, setTitle] = useState("");
  const [agenda, setAgenda] = useState("");
  const [startTime, setStartTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [record, setRecord] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open && workspaceId) {
      fetchMembers();
    }
  }, [open, workspaceId]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const result = await apiClient.getWorkspaceMembers(workspaceId);
      setMembers(result.members.filter((m: Member) => m._id !== user?._id));
    } catch (error: any) {
      toast.error(error.message || 'Failed to load members');
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
      await apiClient.createMeeting(workspaceId, {
        title: title.trim(),
        agenda: agenda.trim() || undefined,
        startTime: startTime || undefined,
        durationMinutes,
        participantIds: selectedParticipants,
        record,
      });

      toast.success('Meeting scheduled successfully');
      onMeetingCreated?.();
      handleClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to schedule meeting');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    if (!creating) {
      setTitle("");
      setAgenda("");
      setStartTime("");
      setDurationMinutes(30);
      setSelectedParticipants([]);
      setRecord(false);
      onOpenChange(false);
    }
  };

  const toggleParticipant = (memberId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-xl border-border shadow-elevated gap-0 p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-semibold">Schedule Meeting</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Plan a synced session with your team
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 p-6 pt-2">
          {/* Main Info */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Topic</Label>
              <Input
                id="title"
                placeholder="e.g. Weekly Design Sync"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11 font-medium text-base rounded-lg border-border focus-visible:ring-primary/20 transition-all shadow-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agenda" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agenda</Label>
              <Textarea
                id="agenda"
                placeholder="What's this meeting about?"
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                rows={3}
                className="resize-none rounded-lg border-border focus-visible:ring-primary/20 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="startTime" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">When</Label>
              <div className="relative">
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-10 rounded-lg border-border shadow-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="duration" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Duration</Label>
              <div className="relative">
                <Input
                  id="duration"
                  type="number"
                  min="15"
                  step="15"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 30)}
                  className="h-10 rounded-lg border-border shadow-sm pr-12"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                  min
                </div>
              </div>
            </div>
          </div>

          {/* Participants */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Who</Label>
            <div className="border border-border rounded-lg max-h-48 overflow-auto bg-muted/10 p-1">
              {loading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : members.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center">No other members available</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {members.map((member) => {
                    const isSelected = selectedParticipants.includes(member._id);
                    return (
                      <button
                        key={member._id}
                        onClick={() => toggleParticipant(member._id)}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-md transition-all text-left group",
                          isSelected ? "bg-primary/10" : "hover:bg-background"
                        )}
                      >
                        <Avatar className="w-6 h-6 border group-hover:border-primary/20">
                          <AvatarFallback className={cn("text-[10px]", isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                            {member.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className={cn("text-xs font-medium truncate flex-1", isSelected ? "text-primary" : "text-foreground")}>
                          {member.name}
                        </span>

                        {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Settings */}
          <div className="pt-2">
            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border border-border/50">
              <Checkbox
                id="record"
                checked={record}
                onCheckedChange={(checked) => setRecord(checked === true)}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <Label htmlFor="record" className="cursor-pointer text-sm font-medium">
                Automatically record and transcribe
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-2 bg-muted/10 border-t border-border/50">
          <Button variant="ghost" onClick={handleClose} disabled={creating} className="rounded-md h-10">
            Cancel
          </Button>
          <Button variant="default" onClick={handleCreate} disabled={creating || !title.trim()} className="rounded-md h-10 px-6 shadow-md bg-primary hover:bg-primary/90 text-white">
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scheduling...
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
