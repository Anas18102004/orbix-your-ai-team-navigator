import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  Users, 
  UserPlus, 
  LayoutGrid,
  Play,
  MessageSquare,
  CheckSquare,
  ArrowRight,
  X
} from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const EmptyDashboard = () => {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-6 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold gradient-text">Orbix</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
            U
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl text-center animate-slide-up">
          {/* Empty State Illustration */}
          <div className="relative mb-8">
            <div className="w-32 h-32 rounded-full bg-secondary/50 flex items-center justify-center mx-auto">
              <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center">
                <Users className="w-12 h-12 text-muted-foreground/50" />
              </div>
            </div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            You're not part of any workspace yet
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto mb-10">
            You will see your tasks, chats, and team activity here once you join a workspace.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link to="/join-workspace">
              <Button variant="hero" size="lg">
                <UserPlus className="w-5 h-5 mr-2" />
                Join Workspace
              </Button>
            </Link>
            <Link to="/welcome">
              <Button variant="outline" size="lg">
                <LayoutGrid className="w-5 h-5 mr-2" />
                Create Workspace
              </Button>
            </Link>
          </div>

          {/* Learn Guide */}
          <button
            onClick={() => setShowGuide(true)}
            className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
          >
            <Play className="w-4 h-4" />
            Learn How Orbix Works (1-minute guide)
          </button>
        </div>
      </main>

      {/* What You'll See Section */}
      <section className="px-6 pb-12">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm text-muted-foreground text-center mb-6">
            Once you join a workspace, you'll have access to:
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-card rounded-xl border border-border p-5 text-center">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-medium mb-1">Team Chat</h3>
              <p className="text-sm text-muted-foreground">
                Communicate with your team
              </p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5 text-center">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mx-auto mb-3">
                <CheckSquare className="w-5 h-5 text-accent" />
              </div>
              <h3 className="font-medium mb-1">Smart Tasks</h3>
              <p className="text-sm text-muted-foreground">
                AI-powered task management
              </p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5 text-center">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-5 h-5 text-foreground" />
              </div>
              <h3 className="font-medium mb-1">AI Assistant</h3>
              <p className="text-sm text-muted-foreground">
                Get intelligent suggestions
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Guide Modal */}
      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-primary" />
              How Orbix Works
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-medium mb-1">Chat naturally</h4>
                  <p className="text-sm text-muted-foreground">
                    Have conversations with your team like you normally would. Orbix listens and understands context.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-medium mb-1">AI extracts tasks</h4>
                  <p className="text-sm text-muted-foreground">
                    Orbix automatically identifies work items, bugs, and action items from your conversations.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-medium mb-1">Smart assignment</h4>
                  <p className="text-sm text-muted-foreground">
                    Tasks are intelligently assigned based on skills, workload, and availability.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm shrink-0">
                  4
                </div>
                <div>
                  <h4 className="font-medium mb-1">Stay aligned</h4>
                  <p className="text-sm text-muted-foreground">
                    Everyone knows what's happening, who's doing what, and what's coming next.
                  </p>
                </div>
              </div>
            </div>
            <Button className="w-full" onClick={() => setShowGuide(false)}>
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmptyDashboard;