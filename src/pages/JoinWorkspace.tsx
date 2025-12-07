import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  UserPlus,
  Link as LinkIcon
} from "lucide-react";
import { toast } from "sonner";

const JoinWorkspace = () => {
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      toast.error("Please enter an invite code or link");
      return;
    }
    
    setIsLoading(true);
    // Simulate joining workspace
    setTimeout(() => {
      setIsLoading(false);
      toast.success("Successfully joined workspace!");
      navigate("/app");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/welcome" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>

          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold gradient-text">Orbix</span>
          </div>

          <div className="animate-slide-up">
            <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-6">
              <UserPlus className="w-7 h-7 text-accent" />
            </div>
            
            <h1 className="text-3xl font-bold mb-2">Join a Workspace</h1>
            <p className="text-muted-foreground mb-8">
              Enter the invite code or link your team shared with you.
            </p>

            <form onSubmit={handleJoin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="invite-code">Invite Code or Link</Label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="invite-code"
                    type="text"
                    placeholder="e.g., ABC123 or https://orbix.app/join/..."
                    className="pl-10"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Ask your team admin for the invite code
                </p>
              </div>

              <Button 
                type="submit" 
                variant="hero" 
                size="lg" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    Join Workspace
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-background px-4 text-muted-foreground">or</span>
              </div>
            </div>

            <div className="space-y-3">
              <Link to="/onboarding">
                <Button variant="outline" className="w-full">
                  Create a new workspace instead
                </Button>
              </Link>
              <Link to="/empty-dashboard">
                <Button variant="ghost" className="w-full text-muted-foreground">
                  Continue without workspace
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Decorative */}
      <div className="hidden lg:flex flex-1 bg-secondary/30 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-primary/5" />
        
        <div className="relative z-10 text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-accent/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-8 animate-float">
            <UserPlus className="w-10 h-10 text-accent" />
          </div>
          
          <h2 className="text-3xl font-bold mb-4">
            Join your team
          </h2>
          <p className="text-lg text-muted-foreground">
            Your team is already using Orbix. Join them to start collaborating with AI-powered workflow management.
          </p>
          
          <div className="mt-10 p-6 rounded-xl bg-card border border-border text-left">
            <h3 className="font-medium mb-4">What happens next?</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs shrink-0 mt-0.5">1</span>
                You'll join the workspace instantly
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs shrink-0 mt-0.5">2</span>
                See your team's chats and tasks
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs shrink-0 mt-0.5">3</span>
                Orbix will help assign work to you
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinWorkspace;