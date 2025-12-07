import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Sparkles, 
  Users, 
  UserPlus, 
  ArrowRight, 
  LayoutGrid,
  Clock
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Welcome = () => {
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinWorkspace = () => {
    if (!inviteCode.trim()) {
      toast.error("Please enter an invite code");
      return;
    }
    setIsJoining(true);
    // Simulate joining
    setTimeout(() => {
      setIsJoining(false);
      toast.success("Successfully joined workspace!");
      navigate("/app");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold gradient-text">Orbix</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl animate-slide-up">
          <div className="text-center mb-12">
            <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6 glow-primary">
              <Sparkles className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Welcome to Orbix
            </h1>
            <p className="text-xl text-muted-foreground max-w-lg mx-auto">
              Choose how you want to get started
            </p>
          </div>

          {/* Option Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Create Workspace */}
            <div className="group bg-card rounded-2xl border border-border p-6 hover:shadow-elegant hover:border-primary/30 transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <LayoutGrid className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Create Workspace</h3>
              <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                Start a new workspace, invite members, and manage work with AI assistance.
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                For team leads & Omnis
              </p>
              <Link to="/onboarding">
                <Button variant="hero" className="w-full">
                  Create Workspace
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Join Workspace */}
            <div className="group bg-card rounded-2xl border border-border p-6 hover:shadow-elegant hover:border-primary/30 transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <UserPlus className="w-7 h-7 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Join Workspace</h3>
              <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                If your team already uses Orbix, join with an invite code or link.
              </p>
              <div className="space-y-3">
                <Input
                  placeholder="Enter invite code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleJoinWorkspace()}
                />
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleJoinWorkspace}
                  disabled={isJoining}
                >
                  {isJoining ? (
                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  ) : (
                    <>
                      Join Workspace
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Continue Without Workspace */}
            <div className="group bg-card rounded-2xl border border-border p-6 hover:shadow-elegant hover:border-primary/30 transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Clock className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Continue Without Workspace</h3>
              <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                Set up your account and wait for your team to invite you.
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Join later when ready
              </p>
              <Link to="/empty-dashboard">
                <Button variant="ghost" className="w-full border border-border hover:bg-secondary">
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-sm text-muted-foreground">
        Need help? <a href="#" className="text-primary hover:underline">Contact Support</a>
      </footer>
    </div>
  );
};

export default Welcome;