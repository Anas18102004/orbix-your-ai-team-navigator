import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
    Calendar,
    Clock,
    Users,
    FileText,
    CheckSquare,
    ArrowLeft,
    Video,
    XCircle,
    CheckCircle,
    Loader2,
    Globe,
    MessageSquare,
    AlertTriangle,
    Target,
    Plus,
    Trash2,
    Edit2,
    Save,
    UserCheck,
    ChevronDown,
    ChevronUp,
    ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import { socketClient } from "@/lib/socket";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

// ============================================================================
// TYPES
// ============================================================================

interface Meeting {
    _id: string;
    title: string;
    description?: string;
    agenda?: string;
    meetingType: string;
    status: string;
    startTime?: string;
    endTime?: string;
    timezone?: string;
    organizer?: { _id: string; name: string; email: string };
    organizerId?: string;
    participants: Array<{
        userId: { _id: string; name: string; email?: string } | string;
        role: string;
        attendanceStatus: string;
        joinedAt?: string;
        leftAt?: string;
    }>;
    aiSummary?: string;
    aiAgenda?: string;
    // VIDEO_PROVIDER_HOOK: External meeting provider fields
    meetingProvider?: 'zoom' | 'google_meet' | 'internal' | null;
    meetingJoinUrl?: string;
    meetingHostUrl?: string;
}

interface ActionItem {
    _id: string;
    title: string;
    description?: string;
    assignedTo?: { _id: string; name: string; email?: string };
    dueDate?: string;
    status: string;
    createdBy?: { _id: string; name: string };
    linkedTaskId?: { _id: string; title: string; status: string };
    createdAt: string;
}

interface MeetingNotes {
    _id: string;
    content: string;
    sections: {
        discussion?: string;
        decisions?: string;
        risks?: string;
        followups?: string;
    };
    createdBy?: { _id: string; name: string };
    lastEditedBy?: { _id: string; name: string };
    updatedAt: string;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const StatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, { class: string; label: string }> = {
        scheduled: { class: "bg-blue-100 text-blue-700", label: "Scheduled" },
        in_progress: { class: "bg-green-100 text-green-700", label: "In Progress" },
        ended: { class: "bg-gray-100 text-gray-700", label: "Ended" },
        cancelled: { class: "bg-red-100 text-red-700", label: "Cancelled" },
        rescheduled: { class: "bg-orange-100 text-orange-700", label: "Rescheduled" },
    };
    const c = config[status] || config.scheduled;
    return <Badge className={cn("text-xs font-medium", c.class)}>{c.label}</Badge>;
};

const MeetingTypeBadge = ({ type }: { type: string }) => {
    const icons: Record<string, string> = {
        standup: "🌅",
        planning: "📋",
        review: "🔍",
        retrospective: "🔄",
        "1:1": "👥",
        custom: "📅",
    };
    return (
        <Badge variant="outline" className="text-xs gap-1">
            <span>{icons[type] || "📅"}</span>
            <span className="capitalize">{type === "1:1" ? "One-on-One" : type}</span>
        </Badge>
    );
};

// ============================================================================
// ACTION ITEMS PANEL
// ============================================================================

const ActionItemsPanel = ({
    meetingId,
    items,
    onRefresh,
}: {
    meetingId: string;
    items: ActionItem[];
    onRefresh: () => void;
}) => {
    const [newTitle, setNewTitle] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [creating, setCreating] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const handleCreate = async () => {
        if (!newTitle.trim()) {
            toast.error("Title is required");
            return;
        }

        try {
            setCreating(true);
            await apiClient.createActionItem(meetingId, {
                title: newTitle.trim(),
                description: newDescription.trim() || undefined,
            });
            toast.success("Action item created");
            setNewTitle("");
            setNewDescription("");
            setShowForm(false);
            onRefresh();
        } catch (error: any) {
            toast.error(error.message || "Failed to create action item");
        } finally {
            setCreating(false);
        }
    };

    const handleStatusChange = async (itemId: string, status: string) => {
        try {
            await apiClient.updateActionItem(meetingId, itemId, { status: status as any });
            toast.success("Status updated");
            onRefresh();
        } catch (error: any) {
            toast.error(error.message || "Failed to update");
        }
    };

    const handleDelete = async (itemId: string) => {
        try {
            await apiClient.deleteActionItem(meetingId, itemId);
            toast.success("Action item deleted");
            onRefresh();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete");
        }
    };

    return (
        <div className="space-y-4">
            {/* Add New */}
            <div className="border border-dashed border-border rounded-lg p-4">
                {showForm ? (
                    <div className="space-y-3">
                        <Input
                            placeholder="What needs to be done?"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            className="font-medium"
                        />
                        <Textarea
                            placeholder="Additional details (optional)"
                            value={newDescription}
                            onChange={(e) => setNewDescription(e.target.value)}
                            rows={2}
                        />
                        <div className="flex gap-2">
                            <Button onClick={handleCreate} disabled={creating} size="sm">
                                {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Add
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-muted-foreground"
                        onClick={() => setShowForm(true)}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add action item
                    </Button>
                )}
            </div>

            {/* List */}
            {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    <CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No action items yet</p>
                    <p className="text-xs">Create action items to track decisions and follow-ups</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {items.map((item) => (
                        <div
                            key={item._id}
                            className={cn(
                                "flex items-start gap-3 p-3 rounded-lg border transition-all",
                                item.status === "completed"
                                    ? "bg-muted/50 border-border/50"
                                    : "bg-background border-border hover:border-primary/30"
                            )}
                        >
                            <Checkbox
                                checked={item.status === "completed"}
                                onCheckedChange={(checked) =>
                                    handleStatusChange(item._id, checked ? "completed" : "pending")
                                }
                                className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                                <p
                                    className={cn(
                                        "font-medium text-sm",
                                        item.status === "completed" && "line-through text-muted-foreground"
                                    )}
                                >
                                    {item.title}
                                </p>
                                {item.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                    {item.assignedTo && (
                                        <span className="flex items-center gap-1">
                                            <UserCheck className="w-3 h-3" />
                                            {item.assignedTo.name}
                                        </span>
                                    )}
                                    {item.dueDate && (
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {format(new Date(item.dueDate), "MMM d")}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDelete(item._id)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ============================================================================
// NOTES EDITOR
// ============================================================================

const NotesEditor = ({
    meetingId,
    notes,
    onRefresh,
}: {
    meetingId: string;
    notes: MeetingNotes | null;
    onRefresh: () => void;
}) => {
    const [content, setContent] = useState(notes?.content || "");
    const [sections, setSections] = useState({
        discussion: notes?.sections?.discussion || "",
        decisions: notes?.sections?.decisions || "",
        risks: notes?.sections?.risks || "",
        followups: notes?.sections?.followups || "",
    });
    const [saving, setSaving] = useState(false);
    const [expanded, setExpanded] = useState<string[]>(["discussion"]);

    useEffect(() => {
        if (notes) {
            setContent(notes.content || "");
            setSections({
                discussion: notes.sections?.discussion || "",
                decisions: notes.sections?.decisions || "",
                risks: notes.sections?.risks || "",
                followups: notes.sections?.followups || "",
            });
        }
    }, [notes]);

    const handleSave = async () => {
        try {
            setSaving(true);
            await apiClient.saveMeetingNotes(meetingId, {
                content,
                sections,
            });
            toast.success("Notes saved");
            onRefresh();
        } catch (error: any) {
            toast.error(error.message || "Failed to save notes");
        } finally {
            setSaving(false);
        }
    };

    const toggleSection = (section: string) => {
        setExpanded((prev) =>
            prev.includes(section)
                ? prev.filter((s) => s !== section)
                : [...prev, section]
        );
    };

    const sectionConfig = [
        { key: "discussion", label: "Discussion", icon: MessageSquare, color: "text-blue-500" },
        { key: "decisions", label: "Decisions", icon: CheckCircle, color: "text-green-500" },
        { key: "risks", label: "Risks", icon: AlertTriangle, color: "text-orange-500" },
        { key: "followups", label: "Follow-ups", icon: Target, color: "text-purple-500" },
    ];

    return (
        <div className="space-y-4">
            {/* Free-form notes */}
            <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    General Notes
                </Label>
                <Textarea
                    placeholder="Capture key points, observations, and context..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={4}
                    className="resize-none"
                />
            </div>

            {/* Structured sections */}
            <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Structured Sections
                </Label>
                <div className="space-y-2">
                    {sectionConfig.map((section) => {
                        const Icon = section.icon;
                        const isExpanded = expanded.includes(section.key);
                        return (
                            <div key={section.key} className="border border-border rounded-lg overflow-hidden">
                                <button
                                    onClick={() => toggleSection(section.key)}
                                    className="flex items-center justify-between w-full p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <Icon className={cn("w-4 h-4", section.color)} />
                                        <span className="font-medium text-sm">{section.label}</span>
                                        {sections[section.key as keyof typeof sections] && (
                                            <Badge variant="secondary" className="text-[10px] px-1.5">
                                                has content
                                            </Badge>
                                        )}
                                    </div>
                                    {isExpanded ? (
                                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                    )}
                                </button>
                                {isExpanded && (
                                    <div className="p-3 border-t border-border">
                                        <Textarea
                                            placeholder={`Enter ${section.label.toLowerCase()}...`}
                                            value={sections[section.key as keyof typeof sections]}
                                            onChange={(e) =>
                                                setSections((prev) => ({
                                                    ...prev,
                                                    [section.key]: e.target.value,
                                                }))
                                            }
                                            rows={3}
                                            className="resize-none"
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Save button */}
            <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                    </>
                ) : (
                    <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Notes
                    </>
                )}
            </Button>

            {/* Last edited info */}
            {notes?.lastEditedBy && (
                <p className="text-xs text-muted-foreground text-center">
                    Last edited by {notes.lastEditedBy.name}{" "}
                    {formatDistanceToNow(new Date(notes.updatedAt), { addSuffix: true })}
                </p>
            )}
        </div>
    );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MeetingDetail() {
    const { meetingId } = useParams<{ meetingId: string }>();
    const navigate = useNavigate();
    const { currentWorkspace, user } = useApp();

    const [meeting, setMeeting] = useState<Meeting | null>(null);
    const [notes, setNotes] = useState<MeetingNotes | null>(null);
    const [actionItems, setActionItems] = useState<ActionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");

    useEffect(() => {
        if (meetingId) {
            fetchMeetingData();
        }
    }, [meetingId]);

    // Set up real-time socket listeners
    // Property 13, 14, 15: Listen for real-time events
    useEffect(() => {
        if (!meetingId) return;

        // Listen for notes updates
        const handleNotesUpdated = (data: any) => {
            setNotes(data.notes);
            if (data.updatedBy !== user?._id) {
                toast.info("Meeting notes updated");
            }
        };

        // Listen for action item creation
        const handleActionItemCreated = (data: any) => {
            setActionItems((prev) => [...prev, data.actionItem]);
            if (data.actionItem.createdBy?._id !== user?._id) {
                toast.info(`Action item created: ${data.actionItem.title}`);
            }
        };

        // Listen for action item updates
        const handleActionItemUpdated = (data: any) => {
            setActionItems((prev) =>
                prev.map((item) =>
                    item._id === data.actionItem._id ? data.actionItem : item
                )
            );
        };

        // Listen for attendance updates
        const handleAttendanceUpdated = (data: any) => {
            setMeeting((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    participants: prev.participants.map((p) =>
                        p.userId === data.participant.userId ||
                        (typeof p.userId === "object" && p.userId._id === data.participant.userId)
                            ? { ...p, attendanceStatus: data.participant.attendanceStatus }
                            : p
                    ),
                };
            });
        };

        socketClient.on(`meeting:notes-updated`, handleNotesUpdated);
        socketClient.on(`meeting:action-item-created`, handleActionItemCreated);
        socketClient.on(`meeting:action-item-updated`, handleActionItemUpdated);
        socketClient.on(`meeting:attendance-updated`, handleAttendanceUpdated);

        return () => {
            socketClient.off(`meeting:notes-updated`, handleNotesUpdated);
            socketClient.off(`meeting:action-item-created`, handleActionItemCreated);
            socketClient.off(`meeting:action-item-updated`, handleActionItemUpdated);
            socketClient.off(`meeting:attendance-updated`, handleAttendanceUpdated);
        };
    }, [meetingId, user?._id]);

    const fetchMeetingData = async () => {
        if (!meetingId) return;

        try {
            setLoading(true);

            // Fetch meeting details
            const meetingResult = await apiClient.getMeeting(meetingId);
            setMeeting(meetingResult);

            // Fetch notes
            try {
                const notesResult = await apiClient.getMeetingNotes(meetingId);
                setNotes(notesResult.notes);
            } catch {
                setNotes(null);
            }

            // Fetch action items
            try {
                const itemsResult = await apiClient.getMeetingActionItems(meetingId);
                setActionItems(itemsResult.actionItems);
            } catch {
                setActionItems([]);
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to load meeting");
            navigate(-1);
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = async () => {
        if (!meetingId) return;
        try {
            await apiClient.completeMeeting(meetingId);
            toast.success("Meeting completed");
            fetchMeetingData();
        } catch (error: any) {
            toast.error(error.message || "Failed to complete meeting");
        }
    };

    const handleCancel = async () => {
        if (!meetingId) return;
        try {
            await apiClient.cancelMeeting(meetingId);
            toast.success("Meeting cancelled");
            fetchMeetingData();
        } catch (error: any) {
            toast.error(error.message || "Failed to cancel meeting");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!meeting) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
                <Video className="w-12 h-12 mb-4 opacity-50" />
                <p>Meeting not found</p>
                <Button variant="ghost" onClick={() => navigate(-1)} className="mt-4">
                    Go Back
                </Button>
            </div>
        );
    }

    const isOrganizer = meeting.organizer?._id === user?._id || meeting.organizerId === user?._id;
    const canManage = isOrganizer;
    const isActive = meeting.status === "scheduled" || meeting.status === "in_progress";

    return (
        <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(-1)}
                        className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back to Meetings
                    </Button>
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-2xl font-bold">{meeting.title}</h1>
                        <StatusBadge status={meeting.status} />
                        <MeetingTypeBadge type={meeting.meetingType} />
                    </div>
                    {meeting.description && (
                        <p className="text-muted-foreground">{meeting.description}</p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    {/* VIDEO_PROVIDER_HOOK: Join Meeting button */}
                    {meeting.meetingJoinUrl && isActive && (
                        <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                                const url = isOrganizer && meeting.meetingHostUrl
                                    ? meeting.meetingHostUrl
                                    : meeting.meetingJoinUrl;
                                window.open(url, '_blank');
                            }}
                        >
                            <Video className="w-4 h-4 mr-1" />
                            Join {meeting.meetingProvider === 'zoom' ? 'Zoom' : meeting.meetingProvider === 'google_meet' ? 'Meet' : 'Meeting'}
                            <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                    )}

                    {canManage && isActive && (
                        <>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <XCircle className="w-4 h-4 mr-1" />
                                        Cancel
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Cancel Meeting?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will mark the meeting as cancelled and notify all participants.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Keep Meeting</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleCancel}>Cancel Meeting</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                            <Button size="sm" onClick={handleComplete}>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Complete
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {meeting.startTime && (
                    <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(meeting.startTime), "PPP")}
                    </div>
                )}
                {meeting.startTime && (
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {format(new Date(meeting.startTime), "p")}
                        {meeting.timezone && ` (${meeting.timezone})`}
                    </div>
                )}
                <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    {meeting.participants?.length || 0} participants
                </div>
                {meeting.organizer && (
                    <div className="flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4" />
                        Organized by {meeting.organizer.name}
                    </div>
                )}
            </div>

            {/* AI Summary (if available) */}
            {meeting.aiSummary && (
                <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary mb-2">
                        <FileText className="w-4 h-4" />
                        AI Summary
                    </div>
                    <p className="text-sm">{meeting.aiSummary}</p>
                </div>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="notes" className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4" />
                        Notes
                    </TabsTrigger>
                    <TabsTrigger value="actions" className="flex items-center gap-1.5">
                        <CheckSquare className="w-4 h-4" />
                        Action Items
                        {actionItems.length > 0 && (
                            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">
                                {actionItems.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    {/* Agenda */}
                    {meeting.agenda && (
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Agenda
                            </Label>
                            <div className="p-4 bg-muted/30 rounded-lg border border-border">
                                <p className="text-sm whitespace-pre-wrap">{meeting.agenda}</p>
                            </div>
                        </div>
                    )}

                    {/* Participants */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Participants
                        </Label>
                        <div className="grid gap-2">
                            {meeting.participants?.map((p, idx) => {
                                const participant = typeof p.userId === "object" ? p.userId : null;
                                return (
                                    <div
                                        key={participant?._id || idx}
                                        className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border"
                                    >
                                        <Avatar className="w-8 h-8">
                                            <AvatarFallback className="text-xs bg-primary text-white">
                                                {participant?.name?.charAt(0) || "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">{participant?.name || "Unknown"}</p>
                                            {participant?.email && (
                                                <p className="text-xs text-muted-foreground">{participant.email}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs capitalize">
                                                {p.role}
                                            </Badge>
                                            <Badge
                                                variant={p.attendanceStatus === "attended" ? "default" : "secondary"}
                                                className="text-xs capitalize"
                                            >
                                                {p.attendanceStatus}
                                            </Badge>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="notes">
                    <NotesEditor
                        meetingId={meetingId!}
                        notes={notes}
                        onRefresh={fetchMeetingData}
                    />
                </TabsContent>

                <TabsContent value="actions">
                    <ActionItemsPanel
                        meetingId={meetingId!}
                        items={actionItems}
                        onRefresh={fetchMeetingData}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
