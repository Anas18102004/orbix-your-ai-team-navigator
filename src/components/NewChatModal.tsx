import { useState, useEffect } from "react";
import { Users, X, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

interface NewChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId?: string;
  onChatCreated?: (chat: { type: 'dm' | 'private_channel'; id: string }) => void;
}

interface Member {
  _id: string;
  name: string;
  email?: string;
  role: string;
  specialization?: string | null;
}

export const NewChatModal = ({ open, onOpenChange, workspaceId, onChatCreated }: NewChatModalProps) => {
  const { currentWorkspace, user } = useApp();
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const effectiveWorkspaceId = workspaceId || currentWorkspace?._id;

  useEffect(() => {
    if (open && effectiveWorkspaceId) {
      fetchMembers();
    }
  }, [open, effectiveWorkspaceId]);

  const fetchMembers = async () => {
    if (!effectiveWorkspaceId) return;
    try {
      setLoading(true);
      const result = await apiClient.getWorkspaceMembers(effectiveWorkspaceId);
      // Filter out current user
      const others = result.members.filter((m: Member) => m._id !== user?._id);
      setWorkspaceMembers(others);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = workspaceMembers.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.email && m.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleParticipant = (memberId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleCreate = async () => {
    if (selectedParticipants.length === 0) {
      toast.error('Please select at least one participant');
      return;
    }

    try {
      setCreating(true);
      const result = await apiClient.createNewChat({
        participants: selectedParticipants,
        workspaceId: effectiveWorkspaceId,
      });

      toast.success('Direct message created');

      // For DMs, navigate to the DM or refresh
      onChatCreated?.({
        type: 'dm',
        id: result.dm?._id || result.channel?._id || '',
      });

      onOpenChange(false);
      setSelectedParticipants([]);
      setSearchQuery("");
    } catch (error: any) {
      toast.error(error.message || 'Failed to create chat');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    if (!creating) {
      setSelectedParticipants([]);
      setSearchQuery("");
      onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Direct Message</DialogTitle>
          <DialogDescription>
            {effectiveWorkspaceId
              ? `Select teammates from ${currentWorkspace?.name || 'workspace'} to start a private conversation`
              : 'Select teammates to start a private conversation'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Selected Participants */}
          {selectedParticipants.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 bg-secondary/50 rounded-lg">
              <span className="text-xs text-muted-foreground self-center">Selected:</span>
              {selectedParticipants.map((id) => {
                const member = workspaceMembers.find((m) => m._id === id);
                if (!member) return null;
                return (
                  <Badge key={id} variant="secondary" className="gap-1">
                    {member.name}
                    <button
                      onClick={() => toggleParticipant(id)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Members List */}
          <div className="border rounded-lg max-h-[300px] overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No members found</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredMembers.map((member) => {
                  const isSelected = selectedParticipants.includes(member._id);
                  return (
                    <button
                      key={member._id}
                      onClick={() => toggleParticipant(member._id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors text-left",
                        isSelected && "bg-primary/10"
                      )}
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm shrink-0">
                        {getInitials(member.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{member.name}</p>
                        {member.specialization && (
                          <p className="text-xs text-muted-foreground truncate">
                            {member.specialization}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                          <X className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Info */}
          {selectedParticipants.length > 1 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm text-muted-foreground">
              <p>
                {selectedParticipants.length} participant{selectedParticipants.length !== 1 ? 's' : ''} selected. This will create a private direct message.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating || selectedParticipants.length === 0}>
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                Create Chat
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
