import { useEffect, useState } from "react";
import { 
  CheckSquare, 
  Clock, 
  AlertTriangle, 
  TrendingUp,
  ArrowRight,
  Sparkles,
  MessageSquare,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { apiClient } from "@/lib/api";
import { socketClient } from "@/lib/socket";
import { format, isToday, parseISO } from "date-fns";

interface Task {
  _id: string;
  title: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  status: 'todo' | 'in_progress' | 'done' | 'blocked';
  dueDate: string | null;
}

const CrewDashboard = () => {
  const { user, currentWorkspace } = useApp();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    completed: 0,
    inProgress: 0,
    productivity: 0,
  });

  useEffect(() => {
    if (!currentWorkspace) return;

    const fetchTasks = async () => {
      try {
        setLoading(true);
        const result = await apiClient.getMyTasks(currentWorkspace._id);
        setTasks(result.tasks);
        
        // Calculate stats
        const completed = result.tasks.filter((t: Task) => t.status === 'done').length;
        const inProgress = result.tasks.filter((t: Task) => t.status === 'in_progress').length;
        const total = result.tasks.length;
        const productivity = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        setStats({ completed, inProgress, productivity });
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();

    // Listen for real-time task updates
    const handleTaskCreated = (data: any) => {
      if (data.task && data.task.workspaceId === currentWorkspace._id) {
        setTasks((prev) => {
          const exists = prev.some((t) => t._id === data.task._id);
          if (exists) return prev;
          const updated = [...prev, data.task];
          // Recalculate stats
          const completed = updated.filter((t: Task) => t.status === 'done').length;
          const inProgress = updated.filter((t: Task) => t.status === 'in_progress').length;
          const total = updated.length;
          const productivity = total > 0 ? Math.round((completed / total) * 100) : 0;
          setStats({ completed, inProgress, productivity });
          return updated;
        });
      }
    };

    const handleTaskUpdated = (data: any) => {
      if (data.task && data.task.workspaceId === currentWorkspace._id) {
        setTasks((prev) => {
          const updated = prev.map((t) => t._id === data.task._id ? data.task : t);
          // Recalculate stats
          const completed = updated.filter((t: Task) => t.status === 'done').length;
          const inProgress = updated.filter((t: Task) => t.status === 'in_progress').length;
          const total = updated.length;
          const productivity = total > 0 ? Math.round((completed / total) * 100) : 0;
          setStats({ completed, inProgress, productivity });
          return updated;
        });
      }
    };

    socketClient.on('task:created', handleTaskCreated);
    socketClient.on('task:updated', handleTaskUpdated);

    return () => {
      socketClient.off('task:created', handleTaskCreated);
      socketClient.off('task:updated', handleTaskUpdated);
    };
  }, [currentWorkspace]);

  const getTodaysTasks = () => {
    return tasks
      .filter((task) => {
        if (task.status === 'done') return false;
        if (!task.dueDate) return false;
        try {
          return isToday(parseISO(task.dueDate));
        } catch {
          return false;
        }
      })
      .slice(0, 3);
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'No due date';
    try {
      const date = parseISO(dateString);
      return format(date, 'h:mm a');
    } catch {
      return 'Invalid date';
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (!currentWorkspace) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto flex items-center justify-center h-full">
        <p className="text-muted-foreground">Please select a workspace</p>
      </div>
    );
  }

  const todaysTasks = getTodaysTasks();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl font-bold mb-2">
          {getGreeting()}, {user?.name?.split(' ')[0] || 'there'}! 👋
        </h1>
        <p className="text-muted-foreground">
          You have {tasks.filter(t => t.status !== 'done').length} active tasks. Here's your focus for the day.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's Tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Orbix Chatbot Card */}
          <Link to="/app/chatbot">
            <div className="bg-gradient-to-br from-primary via-primary to-accent rounded-2xl p-6 border border-primary/20 shadow-elevated hover:shadow-float transition-all group cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white mb-1 text-lg">Orbix Chatbot</h3>
                  <p className="text-white/80 mb-4 text-sm">
                    Your AI teammate is ready to help. Ask questions, get insights, and work smarter.
                  </p>
                  <div className="flex items-center gap-2 text-white/90">
                    <span className="text-sm font-medium">Open Chatbot</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Priority Banner */}
          {todaysTasks.length > 0 && (
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-4 md:p-6 border border-primary/20">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl gradient-ai flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-accent-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold mb-1">Focus on Today</h3>
                  <p className="text-muted-foreground mb-3 text-sm md:text-base">
                    You have {todaysTasks.length} task{todaysTasks.length !== 1 ? 's' : ''} due today. Start with the highest priority.
                  </p>
                  <Link to="/app/tasks">
                    <Button variant="gradient" size="sm">
                      View Tasks
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Tasks List */}
          <div className="bg-card rounded-2xl border border-border shadow-soft">
            <div className="p-4 md:p-5 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h2 className="font-semibold">Today's Tasks</h2>
              <Link to="/app/tasks">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : todaysTasks.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">No tasks due today. Great work! 🎉</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {todaysTasks.map((task) => (
                  <Link 
                    key={task._id} 
                    to={`/app/tasks`}
                    className="flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      task.status === "in_progress" ? "bg-info/10 text-info" : "bg-secondary text-muted-foreground"
                    }`}>
                      {task.status === "in_progress" ? (
                        <Clock className="w-5 h-5" />
                      ) : (
                        <CheckSquare className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{task.title}</p>
                      <p className="text-sm text-muted-foreground">Due: {formatTime(task.dueDate)}</p>
                    </div>
                    <Badge variant={task.priority.toLowerCase() as "p0" | "p1" | "p2"} className="shrink-0">
                      {task.priority}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Link to="/app/chat">
              <Button variant="outline" className="w-full h-auto py-4 justify-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left min-w-0">
                  <p className="font-medium truncate">Open Chat</p>
                  <p className="text-xs text-muted-foreground">Start a conversation</p>
                </div>
              </Button>
            </Link>
            <Link to="/app/tasks">
              <Button variant="outline" className="w-full h-auto py-4 justify-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                  <CheckSquare className="w-5 h-5 text-success" />
                </div>
                <div className="text-left min-w-0">
                  <p className="font-medium truncate">All My Tasks</p>
                  <p className="text-xs text-muted-foreground">{tasks.filter(t => t.status !== 'done').length} active tasks</p>
                </div>
              </Button>
            </Link>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="bg-card rounded-2xl border border-border shadow-soft p-4 md:p-5">
            <h3 className="font-semibold mb-4">This Week</h3>
            <div className="space-y-4">
              <StatItem 
                icon={<CheckSquare className="w-4 h-4" />}
                label="Completed"
                value={`${stats.completed} tasks`}
                trend={stats.completed > 0 ? "+" + stats.completed + " this week" : "No tasks completed"}
                positive={stats.completed > 0}
              />
              <StatItem 
                icon={<Clock className="w-4 h-4" />}
                label="In Progress"
                value={`${stats.inProgress} tasks`}
              />
              <StatItem 
                icon={<TrendingUp className="w-4 h-4" />}
                label="Productivity"
                value={`${stats.productivity}%`}
                trend={stats.productivity > 80 ? "Above average" : stats.productivity > 50 ? "On track" : "Getting started"}
                positive={stats.productivity > 50}
              />
            </div>
          </div>

          {/* Reminders */}
          <div className="bg-card rounded-2xl border border-border shadow-soft p-4 md:p-5">
            <h3 className="font-semibold mb-4">Reminders</h3>
            <div className="space-y-3">
              {tasks.filter(t => t.priority === 'P0' && t.status !== 'done').length > 0 && (
                <ReminderItem 
                  icon={<AlertTriangle className="w-4 h-4 text-warning" />}
                  text={`${tasks.filter(t => t.priority === 'P0' && t.status !== 'done').length} P0 task${tasks.filter(t => t.priority === 'P0' && t.status !== 'done').length !== 1 ? 's' : ''} require attention`}
                />
              )}
              {tasks.filter(t => t.dueDate && parseISO(t.dueDate).getTime() < new Date().getTime() + 2 * 24 * 60 * 60 * 1000 && t.status !== 'done').length > 0 && (
                <ReminderItem 
                  icon={<Clock className="w-4 h-4 text-info" />}
                  text={`${tasks.filter(t => t.dueDate && parseISO(t.dueDate).getTime() < new Date().getTime() + 2 * 24 * 60 * 60 * 1000 && t.status !== 'done').length} task${tasks.filter(t => t.dueDate && parseISO(t.dueDate).getTime() < new Date().getTime() + 2 * 24 * 60 * 60 * 1000 && t.status !== 'done').length !== 1 ? 's' : ''} due soon`}
                />
              )}
              {tasks.filter(t => t.priority === 'P0' && t.status !== 'done').length === 0 && 
               tasks.filter(t => t.dueDate && parseISO(t.dueDate).getTime() < new Date().getTime() + 2 * 24 * 60 * 60 * 1000 && t.status !== 'done').length === 0 && (
                <p className="text-sm text-muted-foreground">No urgent reminders</p>
              )}
            </div>
          </div>

          {/* Mood Check */}
          <div className="bg-gradient-to-br from-secondary to-muted rounded-2xl p-4 md:p-5">
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
    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm text-muted-foreground truncate">{label}</p>
      <p className="font-semibold truncate">{value}</p>
    </div>
    {trend && (
      <span className={`text-xs shrink-0 ${positive ? "text-success" : "text-muted-foreground"}`}>
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
