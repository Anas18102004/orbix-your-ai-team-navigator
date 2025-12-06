import { useState } from "react";
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
  Brain
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const tabs = [
  { id: "my-tasks", label: "My Tasks", count: 5 },
  { id: "assigned", label: "Assigned to Me", count: 3 },
  { id: "due-soon", label: "Due Soon", count: 2 },
  { id: "completed", label: "Completed", count: 12 },
];

const tasks = [
  {
    id: 1,
    title: "Fix Login API failure",
    description: "Auth token refresh causing 500 errors",
    priority: "p0",
    status: "in-progress",
    dueDate: "Today",
    assignee: "John Doe",
    tags: ["bug", "backend"],
    aiCreated: true,
    linkedChat: "#general",
  },
  {
    id: 2,
    title: "Review PR #342 - Auth refactor",
    description: "Code review for authentication module changes",
    priority: "p1",
    status: "todo",
    dueDate: "Today",
    assignee: "John Doe",
    tags: ["review"],
    aiCreated: false,
  },
  {
    id: 3,
    title: "Update deployment documentation",
    description: "Add new CI/CD pipeline steps to docs",
    priority: "p2",
    status: "todo",
    dueDate: "Tomorrow",
    assignee: "John Doe",
    tags: ["docs"],
    aiCreated: true,
    linkedChat: "#backend-squad",
  },
  {
    id: 4,
    title: "Implement rate limiting",
    description: "Add rate limiting to public API endpoints",
    priority: "p1",
    status: "todo",
    dueDate: "Dec 8",
    assignee: "John Doe",
    tags: ["feature", "security"],
    aiCreated: false,
  },
  {
    id: 5,
    title: "Database migration script",
    description: "Prepare migration for user preferences table",
    priority: "p2",
    status: "blocked",
    dueDate: "Dec 10",
    assignee: "John Doe",
    tags: ["database"],
    aiCreated: true,
    blockedBy: "Schema approval pending",
  },
];

const statusColors: Record<string, string> = {
  "todo": "bg-secondary text-muted-foreground",
  "in-progress": "bg-info/10 text-info",
  "blocked": "bg-destructive/10 text-destructive",
  "done": "bg-success/10 text-success",
};

const statusLabels: Record<string, string> = {
  "todo": "To Do",
  "in-progress": "In Progress",
  "blocked": "Blocked",
  "done": "Done",
};

const Tasks = () => {
  const [activeTab, setActiveTab] = useState("my-tasks");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border bg-card/50">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Tasks</h1>
            <p className="text-muted-foreground">Manage and track your work</p>
          </div>
          <Button variant="gradient">
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
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
      <div className="px-6 py-4 border-b border-border flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Priority
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>All Priorities</DropdownMenuItem>
            <DropdownMenuItem>P0 - Critical</DropdownMenuItem>
            <DropdownMenuItem>P1 - High</DropdownMenuItem>
            <DropdownMenuItem>P2 - Medium</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Status
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>All Statuses</DropdownMenuItem>
            <DropdownMenuItem>To Do</DropdownMenuItem>
            <DropdownMenuItem>In Progress</DropdownMenuItem>
            <DropdownMenuItem>Blocked</DropdownMenuItem>
            <DropdownMenuItem>Done</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-auto">
        <div className="divide-y divide-border">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="px-6 py-4 hover:bg-secondary/30 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <button className={cn(
                  "w-5 h-5 rounded border-2 mt-0.5 shrink-0 flex items-center justify-center transition-colors",
                  task.status === "done" 
                    ? "bg-success border-success" 
                    : "border-border hover:border-primary"
                )}>
                  {task.status === "done" && (
                    <CheckSquare className="w-3 h-3 text-success-foreground" />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{task.title}</h3>
                        {task.aiCreated && (
                          <Badge variant="ai" className="text-[10px] gap-1">
                            <Brain className="w-3 h-3" />
                            AI
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                      
                      {/* Tags */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {task.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {task.linkedChat && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <ArrowUpRight className="w-3 h-3" />
                            {task.linkedChat}
                          </Badge>
                        )}
                      </div>

                      {task.blockedBy && (
                        <p className="text-xs text-destructive mt-2">
                          Blocked: {task.blockedBy}
                        </p>
                      )}
                    </div>

                    {/* Right side info */}
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant={task.priority as "p0" | "p1" | "p2"}>
                        {task.priority.toUpperCase()}
                      </Badge>
                      <div className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-medium",
                        statusColors[task.status]
                      )}>
                        {statusLabels[task.status]}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span>{task.assignee}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className={task.dueDate === "Today" ? "text-warning" : ""}>
                        {task.dueDate}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <Button variant="ghost" size="icon-sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Tasks;
