import { useState, useEffect } from "react";
import { 
  TrendingUp, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle,
  Sparkles,
  Loader2,
  Clock,
  Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

interface TimelineItem {
  id: string;
  type: 'ai_summary' | 'task' | 'incident';
  summaryType?: string;
  action?: string;
  text?: string;
  title?: string;
  status?: string;
  assignee?: { name: string } | null;
  metadata?: any;
  createdAt: string;
}

const ProjectUpdates = () => {
  const { currentWorkspace } = useApp();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [health, setHealth] = useState<any>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [summaries, setSummaries] = useState<any[]>([]);

  useEffect(() => {
    if (currentWorkspace) {
      fetchUpdates();
    }
  }, [currentWorkspace]);

  const fetchUpdates = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      const result = await apiClient.getProjectUpdates(currentWorkspace._id);
      setHealth(result.health);
      setTimeline(result.timeline || []);
      setSummaries(result.summaries || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load updates');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!currentWorkspace) return;
    try {
      setGenerating(true);
      await apiClient.generateProjectUpdate(currentWorkspace._id);
      toast.success('Summary generated successfully');
      await fetchUpdates(); // Refresh
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate summary');
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch {
      return dateString;
    }
  };

  if (!currentWorkspace) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto flex items-center justify-center h-full">
        <p className="text-muted-foreground">Please select a workspace</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Project Updates</h1>
          <p className="text-muted-foreground">AI-powered summaries and project timeline</p>
        </div>
        <Button variant="gradient" onClick={handleGenerateSummary} disabled={generating}>
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Summary
            </>
          )}
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Health Card */}
          {health && (
            <div className="bg-card rounded-2xl border border-border shadow-soft p-6">
              <h2 className="font-semibold mb-4">Project Health</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Completion Rate</span>
                    <span className="text-sm font-medium">{health.completionRate}%</span>
                  </div>
                  <Progress value={health.completionRate} className="h-2" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total Tasks</p>
                    <p className="text-2xl font-bold">{health.totalTasks}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Completed</p>
                    <p className="text-2xl font-bold text-success">{health.completedTasks}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">In Progress</p>
                    <p className="text-2xl font-bold text-info">{health.inProgressTasks}</p>
                  </div>
                </div>
                {health.nextMilestone && (
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Next Milestone</p>
                        <p className="text-xs text-muted-foreground">{health.nextMilestone}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-card rounded-2xl border border-border shadow-soft">
            <div className="p-6 border-b border-border">
              <h2 className="font-semibold">Activity Timeline</h2>
            </div>
            <div className="divide-y">
              {timeline.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No activity yet</p>
                </div>
              ) : (
                timeline.map((item) => (
                  <div key={item.id} className="p-4 hover:bg-secondary/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        item.type === 'ai_summary' && "bg-accent/10 text-accent",
                        item.type === 'task' && item.action === 'completed' && "bg-success/10 text-success",
                        item.type === 'task' && item.action === 'created' && "bg-info/10 text-info",
                        item.type === 'incident' && "bg-warning/10 text-warning"
                      )}>
                        {item.type === 'ai_summary' && <Sparkles className="w-4 h-4" />}
                        {item.type === 'task' && item.action === 'completed' && <CheckCircle2 className="w-4 h-4" />}
                        {item.type === 'task' && item.action === 'created' && <Target className="w-4 h-4" />}
                        {item.type === 'incident' && <AlertTriangle className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">
                            {item.type === 'ai_summary' && 'AI Summary'}
                            {item.type === 'task' && `Task ${item.action}`}
                            {item.type === 'incident' && 'Incident'}
                          </p>
                          {item.summaryType && (
                            <Badge variant="outline" className="text-[10px]">
                              {item.summaryType}
                            </Badge>
                          )}
                        </div>
                        {item.text && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{item.text}</p>
                        )}
                        {item.title && (
                          <p className="text-sm font-medium mb-1">{item.title}</p>
                        )}
                        {item.assignee && (
                          <p className="text-xs text-muted-foreground">Assigned to {item.assignee.name}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">{formatDate(item.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Milestones Panel */}
          <div className="bg-card rounded-2xl border border-border shadow-soft p-6">
            <h3 className="font-semibold mb-4">Milestones</h3>
            <div className="space-y-3">
              {health?.nextMilestone ? (
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium">Upcoming</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{health.nextMilestone}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No milestones set</p>
              )}
            </div>
          </div>

          {/* AI Summaries */}
          <div className="bg-card rounded-2xl border border-border shadow-soft p-6">
            <h3 className="font-semibold mb-4">AI Summaries</h3>
            <div className="space-y-3">
              {summaries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No summaries yet. Generate one to get started.</p>
              ) : (
                summaries.slice(0, 5).map((summary) => (
                  <div key={summary._id} className="p-3 bg-secondary/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-3 h-3 text-accent" />
                      <Badge variant="outline" className="text-[10px]">
                        {summary.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{summary.text}</p>
                    <p className="text-xs text-muted-foreground mt-2">{formatDate(summary.createdAt)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectUpdates;
