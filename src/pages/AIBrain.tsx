import { 
  Brain, 
  Sparkles, 
  MessageSquare, 
  CheckSquare, 
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  TrendingUp,
  Users,
  Clock,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const recentDecisions = [
  {
    id: 1,
    action: "Assigned task to John Doe",
    task: "Fix Login API failure",
    reason: "Backend expertise, current workload at 60%, handled similar issues before",
    time: "10 min ago",
    approved: true,
  },
  {
    id: 2,
    action: "Created P0 task from chat",
    task: "Database connection timeout",
    reason: "Keywords detected: 'urgent', 'production down', mentioned 3 times",
    time: "25 min ago",
    approved: true,
  },
  {
    id: 3,
    action: "Suggested reassignment",
    task: "Review authentication module",
    reason: "Original assignee at 95% capacity, Alex has availability",
    time: "1 hour ago",
    pending: true,
  },
];

const insights = [
  {
    icon: Users,
    title: "Team Workload",
    value: "Balanced",
    detail: "All members within healthy capacity",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    icon: Clock,
    title: "Avg Resolution",
    value: "4.2 hours",
    detail: "15% faster than last week",
    color: "text-info",
    bgColor: "bg-info/10",
  },
  {
    icon: TrendingUp,
    title: "AI Accuracy",
    value: "94%",
    detail: "Based on 127 recent assignments",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Zap,
    title: "Tasks Created",
    value: "23 today",
    detail: "18 auto-detected, 5 manual",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
];

const learnings = [
  {
    title: "Assignment pattern updated",
    description: "UI bugs now prefer frontend team (was going to full-stack)",
    type: "improvement",
  },
  {
    title: "Priority calibration",
    description: "Client-related tasks now weighted 20% higher",
    type: "adjustment",
  },
  {
    title: "Overload prevention",
    description: "Added buffer for team members with 3+ P0 tasks",
    type: "protection",
  },
];

const AIBrain = () => {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl gradient-ai flex items-center justify-center glow-accent">
            <Brain className="w-6 h-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Brain</h1>
            <p className="text-muted-foreground">Understand how Orbix thinks and makes decisions</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {insights.map((insight) => (
          <div key={insight.title} className="bg-card rounded-2xl border border-border shadow-soft p-5">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", insight.bgColor)}>
              <insight.icon className={cn("w-5 h-5", insight.color)} />
            </div>
            <p className="text-sm text-muted-foreground mb-1">{insight.title}</p>
            <p className="text-2xl font-bold mb-1">{insight.value}</p>
            <p className="text-xs text-muted-foreground">{insight.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Decisions */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-2xl border border-border shadow-soft">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold">Recent AI Decisions</h2>
              <Button variant="ghost" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
            <div className="divide-y divide-border">
              {recentDecisions.map((decision) => (
                <div key={decision.id} className="p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        decision.action.includes("Assigned") ? "bg-primary/10 text-primary" :
                        decision.action.includes("Created") ? "bg-success/10 text-success" :
                        "bg-warning/10 text-warning"
                      )}>
                        {decision.action.includes("Assigned") ? <CheckSquare className="w-4 h-4" /> :
                         decision.action.includes("Created") ? <Sparkles className="w-4 h-4" /> :
                         <RefreshCw className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="font-medium">{decision.action}</p>
                        <p className="text-sm text-muted-foreground">{decision.task}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{decision.time}</span>
                  </div>
                  
                  <div className="ml-11 p-3 rounded-lg bg-secondary/50 mb-3">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Why: </span>
                      {decision.reason}
                    </p>
                  </div>

                  <div className="ml-11 flex items-center gap-2">
                    {decision.pending ? (
                      <>
                        <Button variant="success" size="sm">
                          <ThumbsUp className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button variant="outline" size="sm">
                          <ThumbsDown className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    ) : (
                      <Badge variant={decision.approved ? "success" : "secondary"}>
                        {decision.approved ? "Approved" : "Overridden"}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Ask Orbix */}
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-5 border border-primary/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-ai flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">Ask Orbix</h3>
                <p className="text-xs text-muted-foreground">Get insights about decisions</p>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <SuggestionChip text="Why was this task assigned?" />
              <SuggestionChip text="Who's the best fit for this?" />
              <SuggestionChip text="Show team workload" />
            </div>
            <Button variant="outline" className="w-full">
              Ask a Question
            </Button>
          </div>

          {/* AI Learnings */}
          <div className="bg-card rounded-2xl border border-border shadow-soft">
            <div className="p-5 border-b border-border">
              <h3 className="font-semibold">Recent Learnings</h3>
              <p className="text-xs text-muted-foreground">How Orbix is improving</p>
            </div>
            <div className="p-5 space-y-4">
              {learnings.map((learning, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                    learning.type === "improvement" ? "bg-success/10 text-success" :
                    learning.type === "adjustment" ? "bg-info/10 text-info" :
                    "bg-warning/10 text-warning"
                  )}>
                    {learning.type === "improvement" ? <TrendingUp className="w-3 h-3" /> :
                     learning.type === "adjustment" ? <RefreshCw className="w-3 h-3" /> :
                     <AlertCircle className="w-3 h-3" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{learning.title}</p>
                    <p className="text-xs text-muted-foreground">{learning.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SuggestionChip = ({ text }: { text: string }) => (
  <button className="w-full text-left text-sm px-3 py-2 rounded-lg bg-card/50 hover:bg-card transition-colors border border-border/50">
    {text}
  </button>
);

export default AIBrain;
