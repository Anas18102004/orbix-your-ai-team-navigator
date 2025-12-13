import { useState, useEffect } from "react";
import {
  CheckSquare,
  Plus,
  Filter,
  Search,
  Clock,
  Calendar,
  MoreHorizontal,
  ChevronDown,
  User,
  Flag,
  ArrowUpRight,
  Brain,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import { apiClient } from "@/lib/api";
import { socketClient } from "@/lib/socket";
import { toast } from "sonner";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Task {
  _id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done' | 'blocked';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  assignee: {
    _id: string;
    name: string;
    email: string;
  } | null;
  creator: {
    _id: string;
    name: string;
    email: string;
  };
  relatedMessageId: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

const statusColors: Record<string, string> = {
  "todo": "bg-secondary text-muted-foreground",
  "in_progress": "bg-info/10 text-info",
  "blocked": "bg-destructive/10 text-destructive",
  "done": "bg-success/10 text-success",
};

const statusLabels: Record<string, string> = {
  "todo": "To Do",
  "in_progress": "In Progress",
  "blocked": "Blocked",
  "done": "Done",
};

const Tasks = () => {
  const { currentWorkspace, user } = useApp();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "P2" as "P0" | "P1" | "P2" | "P3",
    assigneeId: "",
    dueDate: "",
  });

  useEffect(() => {
    if (!currentWorkspace) return;

    const fetchTasks = async () => {
      try {
        setLoading(true);
        const result = await apiClient.getTasks(currentWorkspace._id);
        setTasks(result.tasks);
      } catch (error: any) {
        toast.error(error.message || 'Failed to load tasks');
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();

    // Listen for task updates
    const handleTaskCreated = (data: any) => {
      if (data.task.workspaceId === currentWorkspace._id) {
        setTasks((prev) => [data.task, ...prev]);
      }
    };

    const handleTaskUpdated = (data: any) => {
      if (data.task.workspaceId === currentWorkspace._id) {
        setTasks((prev) =>
          prev.map((t) => (t._id === data.task._id ? data.task : t))
        );
      }
    };

    socketClient.on('task:created', handleTaskCreated);
    socketClient.on('task:updated', handleTaskUpdated);

    return () => {
      socketClient.off('task:created', handleTaskCreated);
      socketClient.off('task:updated', handleTaskUpdated);
    };
  }, [currentWorkspace]);

  useEffect(() => {
    let filtered = tasks;

    // Filter by tab
    if (activeTab === "my-tasks") {
      filtered = filtered.filter((t) => t.assignee?._id === user?._id);
    } else if (activeTab === "assigned") {
      filtered = filtered.filter((t) => t.assignee?._id === user?._id && t.status !== 'done');
    } else if (activeTab === "due-soon") {
      filtered = filtered.filter((t) => {
        if (!t.dueDate) return false;
        const due = parseISO(t.dueDate);
        const now = new Date();
        const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 2 && diffDays >= 0;
      });
    } else if (activeTab === "completed") {
      filtered = filtered.filter((t) => t.status === 'done');
    }

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredTasks(filtered);
  }, [tasks, activeTab, searchQuery, user]);

  const handleCreateTask = async () => {
    if (!currentWorkspace || !newTask.title || !newTask.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await apiClient.createTask(currentWorkspace._id, {
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        assigneeId: newTask.assigneeId || undefined,
        dueDate: newTask.dueDate || undefined,
      });
      toast.success('Task created successfully');
      setCreateDialogOpen(false);
      setNewTask({
        title: "",
        description: "",
        priority: "P2",
        assigneeId: "",
        dueDate: "",
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to create task');
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    if (!currentWorkspace) return;

    try {
      await apiClient.updateTask(currentWorkspace._id, taskId, {
        status: newStatus,
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update task');
    }
  };

  const formatDueDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      const date = parseISO(dateString);
      if (isToday(date)) return "Today";
      if (isTomorrow(date)) return "Tomorrow";
      return format(date, "MMM d");
    } catch {
      return null;
    }
  };

  const getTabCounts = () => {
    const myTasks = tasks.filter((t) => t.assignee?._id === user?._id).length;
    const assigned = tasks.filter((t) => t.assignee?._id === user?._id && t.status !== 'done').length;
    const dueSoon = tasks.filter((t) => {
      if (!t.dueDate) return false;
      const due = parseISO(t.dueDate);
      const now = new Date();
      const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 2 && diffDays >= 0;
    }).length;
    const completed = tasks.filter((t) => t.status === 'done').length;
    return { myTasks, assigned, dueSoon, completed };
  };

  const counts = getTabCounts();

  const tabs = [
    { id: "all", label: "All Tasks", count: tasks.length },
    { id: "my-tasks", label: "My Tasks", count: counts.myTasks },
    { id: "assigned", label: "Assigned to Me", count: counts.assigned },
    { id: "due-soon", label: "Due Soon", count: counts.dueSoon },
    { id: "completed", label: "Completed", count: counts.completed },
  ];

  if (!currentWorkspace) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <p className="text-muted-foreground">Please select a workspace</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-border bg-card/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Tasks</h1>
            <p className="text-muted-foreground">Manage and track your work</p>
          </div>
          <Button variant="gradient" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3 md:px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              )}
            >
              {tab.label}
              <span className={cn(
                "ml-2 px-1.5 py-0.5 rounded text-xs",
                activeTab === tab.id ? "bg-primary-foreground/20" : "bg-muted"
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 md:px-6 py-4 border-b border-border flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" className="hidden sm:flex">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No tasks found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredTasks.map((task) => (
              <div
                key={task._id}
                className="px-4 md:px-6 py-4 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => {
                      const newStatus = task.status === 'done' ? 'todo' : 'done';
                      handleStatusChange(task._id, newStatus);
                    }}
                    className={cn(
                      "w-5 h-5 rounded border-2 mt-0.5 shrink-0 flex items-center justify-center transition-colors",
                      task.status === "done"
                        ? "bg-success border-success"
                        : "border-border hover:border-primary"
                    )}
                  >
                    {task.status === "done" && (
                      <CheckSquare className="w-3 h-3 text-success-foreground" />
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-medium truncate">{task.title}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 break-words">{task.description}</p>

                        {task.relatedMessageId && (
                          <Badge variant="outline" className="text-xs gap-1 mb-2">
                            <ArrowUpRight className="w-3 h-3" />
                            Linked to message
                          </Badge>
                        )}
                      </div>

                      {/* Right side info */}
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant={task.priority.toLowerCase() as "p0" | "p1" | "p2"}>
                          {task.priority}
                        </Badge>
                        <div className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap",
                          statusColors[task.status]
                        )}>
                          {statusLabels[task.status]}
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                      {task.assignee && (
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />
                          <span className="truncate">{task.assignee.name}</span>
                        </div>
                      )}
                      {task.dueDate && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className={isToday(parseISO(task.dueDate)) ? "text-warning" : ""}>
                            {formatDueDate(task.dueDate)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <Button variant="ghost" size="icon-sm" className="shrink-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Task Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Add a new task to track work in your workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Task title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Task description"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={newTask.priority}
                  onValueChange={(value) => setNewTask({ ...newTask, priority: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P0">P0 - Critical</SelectItem>
                    <SelectItem value="P1">P1 - High</SelectItem>
                    <SelectItem value="P2">P2 - Medium</SelectItem>
                    <SelectItem value="P3">P3 - Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTask} disabled={!newTask.title || !newTask.description}>
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tasks;
