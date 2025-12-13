import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Search,
  MoreHorizontal,
  Mail,
  Shield,
  Clock,
  TrendingUp,
  AlertCircle,
  Loader2,
  UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { InviteModal } from "@/components/InviteModal";
import { PendingMembersSection } from "@/components/PendingMembersSection";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TeamMember {
  _id: string;
  name: string;
  email?: string; // Only visible to Omni/Org Admin
  role: 'omni' | 'crew' | 'guest';
  specialization?: string | null;
  joinedAt?: string; // Only visible to Omni/Org Admin
  status?: 'active' | 'removed'; // Only visible to Omni/Org Admin
  pendingRoleDecision?: boolean; // Only visible to Omni/Org Admin
  online?: boolean;
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  available: { bg: "bg-success", text: "text-success", label: "Available" },
  busy: { bg: "bg-warning", text: "text-warning", label: "Busy" },
  dnd: { bg: "bg-destructive", text: "text-destructive", label: "Do Not Disturb" },
};

const Team = () => {
  const { currentWorkspace, user } = useApp();
  const navigate = useNavigate();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [omnis, setOmnis] = useState<TeamMember[]>([]);
  const [crew, setCrew] = useState<TeamMember[]>([]);
  const [pendingCrew, setPendingCrew] = useState<TeamMember[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [viewerRole, setViewerRole] = useState<'org_admin' | 'omni' | 'crew'>('crew');
  const [canSeeFullInfo, setCanSeeFullInfo] = useState(false);
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'members' | 'manage' | 'insights'>('members');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteCodeOpen, setInviteCodeOpen] = useState(false);
  const [inviteCodeLoading, setInviteCodeLoading] = useState(false);

  useEffect(() => {
    if (!currentWorkspace) return;

    const fetchMembers = async () => {
      try {
        setLoading(true);
        const result = await apiClient.getWorkspaceMembers(currentWorkspace._id);
        setMembers(result.members || []);
        setOmnis(result.omnis || []);
        setCrew(result.crew || []);
        setPendingCrew(result.pendingCrew || []);
        setStats(result.stats || null);
        setViewerRole(result.viewerRole || 'crew');
        setCanSeeFullInfo(result.canSeeFullInfo || false);
      } catch (error: any) {
        toast.error(error.message || 'Failed to load team members');
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [currentWorkspace]);

  useEffect(() => {
    if (searchQuery) {
      setFilteredMembers(
        members.filter((m) => {
          if (!m) return false;
          const nameMatch = m.name?.toLowerCase().includes(searchQuery.toLowerCase());
          const emailMatch = canSeeFullInfo && m.email && m.email.toLowerCase().includes(searchQuery.toLowerCase());
          return nameMatch || emailMatch;
        })
      );
    } else {
      setFilteredMembers(members);
    }
  }, [members, searchQuery, canSeeFullInfo]);

  const handleInviteSuccess = async () => {
    // Refresh members list
    if (currentWorkspace) {
      try {
        const result = await apiClient.getWorkspaceMembers(currentWorkspace._id);
        setMembers(result.members);
      } catch (error: any) {
        console.error('Failed to refresh members:', error);
      }
    }
  };

  const handleGenerateInviteCode = async () => {
    if (!currentWorkspace) return;
    try {
      setInviteCodeLoading(true);
      const result = await apiClient.createInvite(currentWorkspace._id);
      setInviteCode(result.invite.code);
      setInviteCodeOpen(true);
      toast.success("Invite code generated");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate invite code");
    } finally {
      setInviteCodeLoading(false);
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

  if (!currentWorkspace) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto flex items-center justify-center h-full">
        <p className="text-muted-foreground">Please select a workspace</p>
      </div>
    );
  }

  // Check if current user is omni or org admin in this workspace
  const isOmni = currentWorkspace?.role === 'omni';
  const isOrgAdmin = currentWorkspace?.role === 'org_admin';
  const canInvite = isOmni || isOrgAdmin;
  const canManage = canSeeFullInfo; // Omni or Org Admin

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Team</h1>
          <p className="text-muted-foreground">
            {stats ? `${stats.total} member${stats.total !== 1 ? 's' : ''}` : `${members.length} member${members.length !== 1 ? 's' : ''}`} in this workspace
          </p>
        </div>
        {canInvite && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleGenerateInviteCode} disabled={inviteCodeLoading}>
              {inviteCodeLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Generate Invite Code
                </>
              )}
            </Button>
            <Button variant="gradient" onClick={() => setInviteModalOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Member
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      {canManage && (
        <div className="flex gap-2 mb-6 border-b border-border">
          <button
            onClick={() => setActiveTab('members')}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'members'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Members
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'manage'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Manage
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'insights'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Insights
          </button>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search team members..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border shadow-soft p-8 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-2">No members found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? 'Try a different search term' : 'Start by inviting team members'}
          </p>
          {!searchQuery && (
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button variant="outline" onClick={handleGenerateInviteCode} disabled={inviteCodeLoading}>
                {inviteCodeLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 mr-2" />
                    Generate Invite Code
                  </>
                )}
              </Button>
              <Button variant="gradient" onClick={() => setInviteModalOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Invite First Member
              </Button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Tab Content */}
          {activeTab === 'members' && (
            <>
              {/* Pending Members Section - Only show in Members tab if canManage */}
              {canManage && pendingCrew.length > 0 && currentWorkspace && (
                <div className="mb-6">
                  <PendingMembersSection
                    workspaceId={currentWorkspace._id}
                    isOrgAdmin={isOrgAdmin}
                    onUpdate={handleInviteSuccess}
                  />
                </div>
              )}

              {/* Team Grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMembers.map((member) => (
                  <div key={member._id} className="bg-card rounded-2xl border border-border shadow-soft p-4 md:p-5 hover:shadow-elevated transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                            {getInitials(member.name)}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-card bg-success" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold flex items-center gap-2 min-w-0">
                              <span className="truncate max-w-[180px]">
                                {member.name}
                              </span>
                              {user?._id && String(member._id) === String(user._id) && (
                                <Badge variant="outline" className="text-[10px] px-2 py-0.5 whitespace-nowrap">
                                  you
                                </Badge>
                              )}
                            </h3>
                            {member.role === 'omni' && (
                              <Badge variant="omni" className="text-[10px] shrink-0">
                                <Shield className="w-3 h-3 mr-0.5" />
                                Omni
                              </Badge>
                            )}
                          </div>
                          {canSeeFullInfo && member.email && (
                            <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                          )}
                          {!canSeeFullInfo && member.specialization && (
                            <p className="text-sm text-muted-foreground truncate">{member.specialization}</p>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" className="shrink-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(member.email)}>
                            Copy email
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(member.name)}>
                            Copy name
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success">
                        {member.online ? 'Online' : 'Offline'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {member.role}
                      </span>
                      {member.specialization && (
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                          {member.specialization}
                        </span>
                      )}
                      {canSeeFullInfo && member.joinedAt && (
                        <span className="text-xs text-muted-foreground">
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => navigate(`/chat?userId=${member._id}`)}
                      >
                        <Mail className="w-4 h-4 mr-1" />
                        Message
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'manage' && canManage && (
            <div className="space-y-6">
              <div className="bg-card rounded-2xl border border-border shadow-soft p-6">
                <h3 className="font-semibold mb-4">Invite & Manage</h3>
                <div className="space-y-4">
                  {pendingCrew.length > 0 && currentWorkspace && (
                    <PendingMembersSection
                      workspaceId={currentWorkspace._id}
                      isOrgAdmin={isOrgAdmin}
                      onUpdate={handleInviteSuccess}
                    />
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleGenerateInviteCode} disabled={inviteCodeLoading}>
                      {inviteCodeLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Users className="w-4 h-4 mr-2" />
                          Generate Invite Code
                        </>
                      )}
                    </Button>
                    <Button variant="gradient" onClick={() => setInviteModalOpen(true)}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Invite Member
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'insights' && canManage && (
            <div className="space-y-6">
              <div className="bg-card rounded-2xl border border-border shadow-soft p-6">
                <h3 className="font-semibold mb-4">Team Insights</h3>
                {stats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-2xl font-bold">{stats.total}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Omnis</p>
                      <p className="text-2xl font-bold">{stats.omnis}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Crew</p>
                      <p className="text-2xl font-bold">{stats.crew}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <p className="text-2xl font-bold">{stats.pendingCrew}</p>
                    </div>
                  </div>
                )}
                {pendingCrew.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Pending Role Decisions</h4>
                    <p className="text-sm text-muted-foreground">
                      {pendingCrew.length} member{pendingCrew.length !== 1 ? 's' : ''} need role/specialization finalized
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* New Invite Modal */}
      {currentWorkspace && (
        <InviteModal
          open={inviteModalOpen}
          onOpenChange={setInviteModalOpen}
          workspaceId={currentWorkspace._id}
          isOrgAdmin={isOrgAdmin}
          onSuccess={handleInviteSuccess}
        />
      )}

      {/* Invite Code Dialog */}
      <Dialog open={inviteCodeOpen} onOpenChange={setInviteCodeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Invite Code Generated</DialogTitle>
            <DialogDescription>
              Share this code with your teammate. They can join from “Join Workspace” using this code.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl border border-border bg-muted/40 text-center">
              <p className="text-3xl font-mono font-bold tracking-widest select-all">{inviteCode}</p>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Code does not expire until used. You can regenerate anytime.
            </p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(inviteCode);
                toast.success("Invite code copied");
              }}
              className="w-full sm:w-auto"
            >
              Copy Code
            </Button>
            <Button
              variant="gradient"
              onClick={() => {
                const link = `${window.location.origin}/join-workspace?code=${inviteCode}`;
                navigator.clipboard.writeText(link);
                toast.success("Invite link copied");
              }}
              className="w-full sm:w-auto"
            >
              Copy Invite Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Team;
