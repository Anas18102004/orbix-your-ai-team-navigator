import { 
  Users, 
  Search, 
  MoreHorizontal,
  Mail,
  Shield,
  Clock,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const teamMembers = [
  {
    id: 1,
    name: "John Doe",
    role: "Backend Developer",
    avatar: "JD",
    status: "available",
    workload: 65,
    activeTasks: 4,
    completedThisWeek: 8,
    isOmni: false,
  },
  {
    id: 2,
    name: "Sarah Chen",
    role: "Frontend Developer",
    avatar: "SC",
    status: "busy",
    workload: 85,
    activeTasks: 6,
    completedThisWeek: 5,
    isOmni: false,
  },
  {
    id: 3,
    name: "Mike Johnson",
    role: "DevOps Engineer",
    avatar: "MJ",
    status: "available",
    workload: 40,
    activeTasks: 2,
    completedThisWeek: 10,
    isOmni: true,
  },
  {
    id: 4,
    name: "Alex Kumar",
    role: "QA Engineer",
    avatar: "AK",
    status: "dnd",
    workload: 55,
    activeTasks: 3,
    completedThisWeek: 7,
    isOmni: false,
  },
  {
    id: 5,
    name: "Emily White",
    role: "Product Manager",
    avatar: "EW",
    status: "available",
    workload: 70,
    activeTasks: 5,
    completedThisWeek: 4,
    isOmni: true,
  },
];

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  available: { bg: "bg-success", text: "text-success", label: "Available" },
  busy: { bg: "bg-warning", text: "text-warning", label: "Busy" },
  dnd: { bg: "bg-destructive", text: "text-destructive", label: "Do Not Disturb" },
};

const Team = () => {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Team</h1>
          <p className="text-muted-foreground">{teamMembers.length} members in this workspace</p>
        </div>
        <Button variant="gradient">
          <Users className="w-4 h-4 mr-2" />
          Invite Member
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search team members..." className="pl-9" />
        </div>
      </div>

      {/* Workload Overview */}
      <div className="bg-card rounded-2xl border border-border shadow-soft p-6 mb-6">
        <h2 className="font-semibold mb-4">Team Workload Heatmap</h2>
        <div className="space-y-4">
          {teamMembers.map((member) => (
            <div key={member.id} className="flex items-center gap-4">
              <div className="w-32 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs">
                  {member.avatar}
                </div>
                <span className="text-sm font-medium truncate">{member.name.split(" ")[0]}</span>
              </div>
              <div className="flex-1">
                <Progress 
                  value={member.workload} 
                  className={cn(
                    "h-3",
                    member.workload > 80 ? "[&>div]:bg-destructive" :
                    member.workload > 60 ? "[&>div]:bg-warning" :
                    "[&>div]:bg-success"
                  )}
                />
              </div>
              <span className={cn(
                "text-sm font-medium w-12 text-right",
                member.workload > 80 ? "text-destructive" :
                member.workload > 60 ? "text-warning" :
                "text-success"
              )}>
                {member.workload}%
              </span>
            </div>
          ))}
        </div>
        {teamMembers.some(m => m.workload > 80) && (
          <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-warning shrink-0" />
            <p className="text-sm text-warning">Some team members are near capacity. Consider rebalancing tasks.</p>
          </div>
        )}
      </div>

      {/* Team Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teamMembers.map((member) => (
          <div key={member.id} className="bg-card rounded-2xl border border-border shadow-soft p-5 hover:shadow-elevated transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {member.avatar}
                  </div>
                  <span className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-card",
                    statusColors[member.status].bg
                  )} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{member.name}</h3>
                    {member.isOmni && (
                      <Badge variant="omni" className="text-[10px]">
                        <Shield className="w-3 h-3 mr-0.5" />
                        Omni
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{member.role}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className={cn(
                "text-xs px-2 py-1 rounded-full",
                statusColors[member.status].bg + "/10",
                statusColors[member.status].text
              )}>
                {statusColors[member.status].label}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{member.activeTasks}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{member.completedThisWeek}</p>
                <p className="text-xs text-muted-foreground">This Week</p>
              </div>
              <div>
                <p className={cn(
                  "text-2xl font-bold",
                  member.workload > 80 ? "text-destructive" :
                  member.workload > 60 ? "text-warning" :
                  "text-success"
                )}>
                  {member.workload}%
                </p>
                <p className="text-xs text-muted-foreground">Capacity</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border flex items-center gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Mail className="w-4 h-4 mr-1" />
                Message
              </Button>
              <Button variant="ghost" size="sm" className="flex-1">
                View Tasks
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Team;
