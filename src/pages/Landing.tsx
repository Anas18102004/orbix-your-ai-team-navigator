import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  CheckSquare, 
  Brain, 
  Users, 
  Shield, 
  Sparkles,
  ArrowRight,
  Play
} from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold gradient-text">Orbix</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it Works</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          </div>
          
          <div className="flex items-center gap-3">
            <Link to="/auth?mode=login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button variant="gradient" size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        
        <div className="container mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border mb-8 animate-slide-down">
            <span className="w-2 h-2 rounded-full gradient-ai ai-pulse" />
            <span className="text-sm text-muted-foreground">Human-first AI for teams</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl mx-auto animate-slide-up">
            The AI Operating System
            <span className="block gradient-text">for Modern Teams</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Orbix sits on top of your conversations, understands what needs to be done, 
            and intelligently assigns work—while respecting privacy, emotions, and human control.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <Link to="/auth?mode=signup">
              <Button variant="hero" size="xl" className="group">
                Start for Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button variant="outline" size="xl" className="gap-2">
              <Play className="w-5 h-5" />
              Watch Demo
            </Button>
          </div>
          
          {/* App Preview */}
          <div className="mt-20 relative animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <div className="absolute inset-0 gradient-primary opacity-10 blur-3xl rounded-3xl" />
            <div className="relative bg-card rounded-2xl shadow-float border border-border overflow-hidden">
              <div className="aspect-[16/9] bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
                <div className="text-center p-12">
                  <div className="flex items-center justify-center gap-8 mb-8">
                    <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center glow-primary animate-float">
                      <MessageSquare className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <ArrowRight className="w-6 h-6 text-muted-foreground" />
                    <div className="w-16 h-16 rounded-2xl gradient-ai flex items-center justify-center glow-accent animate-float" style={{ animationDelay: "0.5s" }}>
                      <Brain className="w-8 h-8 text-accent-foreground" />
                    </div>
                    <ArrowRight className="w-6 h-6 text-muted-foreground" />
                    <div className="w-16 h-16 rounded-2xl bg-success flex items-center justify-center animate-float" style={{ animationDelay: "1s" }}>
                      <CheckSquare className="w-8 h-8 text-success-foreground" />
                    </div>
                  </div>
                  <p className="text-2xl font-semibold text-foreground mb-2">Chat → AI → Tasks</p>
                  <p className="text-muted-foreground">Your conversations become organized work</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-secondary/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything your team needs</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Orbix combines chat, task management, and AI intelligence into one seamless experience.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
            <FeatureCard
              icon={<MessageSquare className="w-6 h-6" />}
              title="Smart Chat"
              description="WhatsApp-like messaging with AI that understands context and extracts actionable tasks automatically."
            />
            <FeatureCard
              icon={<Brain className="w-6 h-6" />}
              title="AI Brain"
              description="Intelligent task detection, classification, and assignment based on skills, workload, and team dynamics."
            />
            <FeatureCard
              icon={<CheckSquare className="w-6 h-6" />}
              title="Task Flow"
              description="Agile, Kanban, or hybrid workflows. Dependencies, priorities, and status tracking built-in."
            />
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="Team Insights"
              description="Non-toxic performance insights. Workload heatmaps, burnout detection, and fair task distribution."
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="Privacy First"
              description="Choose what AI sees. Private DMs, AI-free channels, and complete transparency."
            />
            <FeatureCard
              icon={<Sparkles className="w-6 h-6" />}
              title="Human Control"
              description="AI assists, humans decide. Override any AI action with full explainability."
            />
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How Orbix Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From conversation to completion in three simple steps.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="01"
              title="Chat Naturally"
              description="Your team communicates as usual. Mention issues, discuss features, flag bugs."
            />
            <StepCard
              number="02"
              title="AI Understands"
              description="Orbix detects tasks, understands urgency, and identifies the right person for each job."
            />
            <StepCard
              number="03"
              title="Work Gets Done"
              description="Tasks are assigned, tracked, and completed. Everyone stays aligned without extra effort."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <div className="relative rounded-3xl gradient-primary p-12 md:p-20 text-center overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L3N2Zz4=')] opacity-30" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-6">
                Ready to transform your team?
              </h2>
              <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
                Join teams who've already discovered the power of human-first AI collaboration.
              </p>
              <Link to="/auth?mode=signup">
                <Button variant="glass" size="xl" className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20">
                  Get Started Free
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Orbix</span>
          </div>
          
          <p className="text-sm text-muted-foreground">
            © 2024 Orbix. Human-first AI for teams.
          </p>
          
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="bg-card rounded-2xl p-6 shadow-soft border border-border hover:shadow-elevated transition-all duration-300 hover:-translate-y-1">
    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground mb-4">
      {icon}
    </div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground">{description}</p>
  </div>
);

const StepCard = ({ number, title, description }: { number: string; title: string; description: string }) => (
  <div className="text-center">
    <div className="w-16 h-16 rounded-full gradient-primary text-primary-foreground text-2xl font-bold flex items-center justify-center mx-auto mb-6 glow-primary">
      {number}
    </div>
    <h3 className="text-xl font-semibold mb-3">{title}</h3>
    <p className="text-muted-foreground">{description}</p>
  </div>
);

export default Landing;
