import { 
  CheckSquare, 
  Clock, 
  AlertTriangle, 
  TrendingUp,
  ArrowRight,
  Sparkles,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const todaysTasks = [
  { id: 1, title: "Fix Login API failure", priority: "p0", status: "in-progress", dueTime: "2:00 PM" },
  { id: 2, title: "Review PR #342 - Auth refactor", priority: "p1", status: "todo", dueTime: "4:00 PM" },
  { id: 3, title: "Update deployment docs", priority: "p2", status: "todo", dueTime: "EOD" },
];

const suggestions = [
  "Complete the Login API fix first - it's blocking QA",
  "Consider syncing with DevOps about deployment timeline",
  "You've been highly productive this week! 🎉",
];

const CrewDashboard = () => {
  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Good morning, John! 👋</h1>
        <p className="text-muted-foreground">
          You have {todaysTasks.length} tasks today. Here's your focus for the day.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's Tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Priority Banner */}
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-6 border border-primary/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl gradient-ai flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-accent-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">AI Suggestion</h3>
                <p className="text-muted-foreground mb-3">
                  {suggestions[0]}
                </p>
                <Link to="/app/tasks/1">
                  <Button variant="gradient" size="sm">
                    Start Working
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Tasks List */}
          <div className="bg-card rounded-2xl border border-border shadow-soft">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold">Today's Tasks</h2>
              <Link to="/app/tasks">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="divide-y divide-border">
              {todaysTasks.map((task) => (
                <Link 
                  key={task.id} 
                  to={`/app/tasks/${task.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    task.status === "in-progress" ? "bg-info/10 text-info" : "bg-secondary text-muted-foreground"
                  }`}>
                    {task.status === "in-progress" ? (
                      <Clock className="w-5 h-5" />
                    ) : (
                      <CheckSquare className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{task.title}</p>
                    <p className="text-sm text-muted-foreground">Due: {task.dueTime}</p>
                  </div>
                  <Badge variant={task.priority as "p0" | "p1" | "p2"}>
                    {task.priority.toUpperCase()}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Link to="/app/chat">
              <Button variant="outline" className="w-full h-auto py-4 justify-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Open Chat</p>
                  <p className="text-xs text-muted-foreground">3 unread messages</p>
                </div>
              </Button>
            </Link>
            <Link to="/app/tasks">
              <Button variant="outline" className="w-full h-auto py-4 justify-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 text-success" />
                </div>
                <div className="text-left">
                  <p className="font-medium">All My Tasks</p>
                  <p className="text-xs text-muted-foreground">5 active tasks</p>
                </div>
              </Button>
            </Link>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="bg-card rounded-2xl border border-border shadow-soft p-5">
            <h3 className="font-semibold mb-4">This Week</h3>
            <div className="space-y-4">
              <StatItem 
                icon={<CheckSquare className="w-4 h-4" />}
                label="Completed"
                value="12 tasks"
                trend="+3 from last week"
                positive
              />
              <StatItem 
                icon={<Clock className="w-4 h-4" />}
                label="In Progress"
                value="4 tasks"
              />
              <StatItem 
                icon={<TrendingUp className="w-4 h-4" />}
                label="Productivity"
                value="94%"
                trend="Above average"
                positive
              />
            </div>
          </div>

          {/* Reminders */}
          <div className="bg-card rounded-2xl border border-border shadow-soft p-5">
            <h3 className="font-semibold mb-4">Reminders</h3>
            <div className="space-y-3">
              <ReminderItem 
                icon={<AlertTriangle className="w-4 h-4 text-warning" />}
                text="Sprint review tomorrow at 10 AM"
              />
              <ReminderItem 
                icon={<Clock className="w-4 h-4 text-info" />}
                text="API deadline in 2 days"
              />
            </div>
          </div>

          {/* Mood Check */}
          <div className="bg-gradient-to-br from-secondary to-muted rounded-2xl p-5">
            <h3 className="font-semibold mb-3">How are you feeling?</h3>
            <div className="flex gap-2">
              {["😊", "😐", "😓"].map((emoji) => (
                <button 
                  key={emoji}
                  className="flex-1 py-3 rounded-xl bg-card hover:bg-card/80 transition-colors text-2xl shadow-soft"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              This helps Orbix understand your wellbeing
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatItem = ({ 
  icon, 
  label, 
  value, 
  trend, 
  positive 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  trend?: string; 
  positive?: boolean;
}) => (
  <div className="flex items-center gap-3">
    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
      {icon}
    </div>
    <div className="flex-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
    {trend && (
      <span className={`text-xs ${positive ? "text-success" : "text-muted-foreground"}`}>
        {trend}
      </span>
    )}
  </div>
);

const ReminderItem = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
    {icon}
    <span className="text-sm">{text}</span>
  </div>
);

export default CrewDashboard;
