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
  Play,
  Zap,
  Eye,
  AlertTriangle,
  Heart,
  Check,
  Send,
  MoreHorizontal
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <LivePreviewSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </div>
  );
};

// ========================
// NAVBAR
// ========================
const Navbar = () => (
  <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
    <div className="container mx-auto px-6 py-4 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-soft">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold gradient-text">Orbix</span>
      </Link>
      
      <div className="hidden md:flex items-center gap-8">
        <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it Works</a>
        <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
        <a href="#preview" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Preview</a>
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
);

// ========================
// HERO SECTION
// ========================
const HeroSection = () => {
  return (
    <section className="pt-28 pb-16 md:pt-36 md:pb-24 px-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 concentric-circles" />
      <div className="blob-bg w-[500px] h-[500px] bg-primary/10 -top-40 -left-40" />
      <div className="blob-bg w-[400px] h-[400px] bg-accent/10 top-20 right-0" />
      <div className="blob-bg w-[300px] h-[300px] bg-success/10 bottom-20 left-1/4" />
      
      <div className="container mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border mb-6 animate-slide-down">
              <span className="w-2 h-2 rounded-full gradient-ai ai-pulse" />
              <span className="text-sm text-muted-foreground">Human-first AI for teams</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 animate-slide-up">
              Meet Orbix — Your
              <span className="block gradient-text">AI Operating System</span>
              <span className="block">for Teams</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mb-8 animate-slide-up mx-auto lg:mx-0" style={{ animationDelay: "0.1s" }}>
              Orbix sits on top of your chats, understands what needs to be done, and turns chaos into clear, aligned work — automatically.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <Link to="/auth?mode=signup">
                <Button variant="hero" size="xl" className="group w-full sm:w-auto">
                  Get Started Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button variant="outline" size="xl" className="gap-2 w-full sm:w-auto">
                <Play className="w-5 h-5" />
                Watch Orbix in action
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground mt-6 animate-slide-up" style={{ animationDelay: "0.3s" }}>
              No credit card required. Built with privacy in mind.
            </p>
          </div>
          
          {/* Right animated visual */}
          <div className="relative h-[400px] md:h-[500px] animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <HeroAnimation />
          </div>
        </div>
      </div>
    </section>
  );
};

// Animated hero visual with orbiting cards
const HeroAnimation = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Center AI Orb */}
      <div className="absolute w-24 h-24 md:w-32 md:h-32 rounded-full gradient-ai flex items-center justify-center animate-glow-pulse z-20">
        <Brain className="w-10 h-10 md:w-14 md:h-14 text-accent-foreground" />
      </div>
      
      {/* Orbital ring */}
      <div className="absolute w-[280px] h-[280px] md:w-[380px] md:h-[380px] rounded-full border border-border/50" />
      <div className="absolute w-[340px] h-[340px] md:w-[460px] md:h-[460px] rounded-full border border-border/30" />
      
      {/* Chat card - orbiting */}
      <div className="absolute animate-orbit" style={{ animationDuration: "20s" }}>
        <div className="bg-card rounded-xl shadow-elevated border border-border p-3 w-48 md:w-56">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
              <MessageSquare className="w-3 h-3 text-primary" />
            </div>
            <span className="text-xs font-medium">Team Chat</span>
          </div>
          <div className="space-y-1.5">
            <div className="bg-muted rounded-lg px-2.5 py-1.5 text-xs">Login API failing again 😭</div>
            <div className="bg-primary/10 rounded-lg px-2.5 py-1.5 text-xs ml-4">On it! Checking logs now</div>
          </div>
        </div>
      </div>
      
      {/* Task card - orbiting opposite */}
      <div className="absolute animate-orbit-reverse" style={{ animationDuration: "25s" }}>
        <div className="bg-card rounded-xl shadow-elevated border border-border p-3 w-44 md:w-52">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center">
              <CheckSquare className="w-3 h-3 text-success" />
            </div>
            <span className="text-xs font-medium">Tasks</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              <Check className="w-3 h-3 text-success" />
              <span className="line-through text-muted-foreground">Fix auth bug</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded border border-border" />
              <span>Deploy to staging</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Floating particles */}
      <div className="absolute top-10 left-10 w-2 h-2 rounded-full bg-primary/30 animate-float" />
      <div className="absolute bottom-20 right-10 w-3 h-3 rounded-full bg-accent/30 animate-float" style={{ animationDelay: "1s" }} />
      <div className="absolute top-1/3 right-5 w-2 h-2 rounded-full bg-success/30 animate-float" style={{ animationDelay: "2s" }} />
    </div>
  );
};

// ========================
// HOW IT WORKS SECTION
// ========================
const HowItWorksSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
          }
        });
      },
      { threshold: 0.1 }
    );
    
    const elements = sectionRef.current?.querySelectorAll(".scroll-reveal");
    elements?.forEach((el) => observer.observe(el));
    
    return () => observer.disconnect();
  }, []);

  const steps = [
    {
      icon: <MessageSquare className="w-7 h-7" />,
      title: "It listens to your chats",
      description: "Orbix reads your team's chats (in AI-enabled channels) and spots real work hidden inside the messages."
    },
    {
      icon: <Brain className="w-7 h-7" />,
      title: "It understands and plans",
      description: "It detects tasks, assigns them to the right people based on skills and workload, and predicts bottlenecks."
    },
    {
      icon: <Users className="w-7 h-7" />,
      title: "It keeps everyone aligned",
      description: "It reminds, tracks, and summarizes so work flows smoothly without micro-management."
    }
  ];

  return (
    <section id="how-it-works" ref={sectionRef} className="py-20 px-6 bg-secondary/30">
      <div className="container mx-auto">
        <div className="text-center mb-16 scroll-reveal">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How Orbix works in your team</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From chaos to clarity in three simple steps.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div 
              key={index} 
              className="scroll-reveal text-center bg-card rounded-2xl p-8 border border-border shadow-soft card-lift"
              style={{ transitionDelay: `${index * 0.15}s` }}
            >
              <div className="w-16 h-16 rounded-2xl gradient-primary text-primary-foreground flex items-center justify-center mx-auto mb-6 glow-primary">
                {step.icon}
              </div>
              <div className="text-sm font-semibold text-primary mb-2">Step {index + 1}</div>
              <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ========================
// FEATURES SECTION
// ========================
const FeaturesSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
          }
        });
      },
      { threshold: 0.1 }
    );
    
    const elements = sectionRef.current?.querySelectorAll(".scroll-reveal");
    elements?.forEach((el) => observer.observe(el));
    
    return () => observer.disconnect();
  }, []);

  const features = [
    { icon: <Zap className="w-6 h-6" />, title: "Realtime chat + tasks", description: "Messages instantly become actionable tasks without context switching." },
    { icon: <Brain className="w-6 h-6" />, title: "Smart, fair assignment engine", description: "AI considers skills, workload, and fairness when assigning work." },
    { icon: <Eye className="w-6 h-6" />, title: "Explainable AI decisions", description: "Every AI action can be questioned. Transparency is built in." },
    { icon: <Shield className="w-6 h-6" />, title: "No-surveillance, privacy-first", description: "You control what AI sees. Private channels stay private." },
    { icon: <AlertTriangle className="w-6 h-6" />, title: "Crisis mode for P0 incidents", description: "Automatic escalation and focused response for critical issues." },
    { icon: <Heart className="w-6 h-6" />, title: "Non-toxic performance insights", description: "Recognition over ranking. Wellbeing over burnout metrics." },
  ];

  return (
    <section id="features" ref={sectionRef} className="py-20 px-6">
      <div className="container mx-auto">
        <div className="text-center mb-16 scroll-reveal">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for fast-moving IT teams</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything your team needs to stay productive, aligned, and healthy.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="scroll-reveal bg-card rounded-2xl p-6 border border-border shadow-soft card-lift group"
              style={{ transitionDelay: `${index * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-secondary group-hover:gradient-primary flex items-center justify-center text-primary group-hover:text-primary-foreground mb-4 transition-all duration-300">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ========================
// LIVE PREVIEW SECTION
// ========================
const LivePreviewSection = () => {
  const [messageVisible, setMessageVisible] = useState(false);
  const [taskVisible, setTaskVisible] = useState(false);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageVisible(true);
      setTaskVisible(false);
      
      setTimeout(() => {
        setTaskVisible(true);
      }, 1500);
      
      setTimeout(() => {
        setMessageVisible(false);
        setTaskVisible(false);
      }, 5000);
    }, 6000);
    
    // Initial trigger
    setTimeout(() => {
      setMessageVisible(true);
      setTimeout(() => setTaskVisible(true), 1500);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="preview" className="py-20 px-6 bg-secondary/30">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">See what your team looks like inside Orbix</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A unified workspace where chat, tasks, and AI work together seamlessly.
          </p>
        </div>
        
        <div className="relative bg-card rounded-2xl shadow-float border border-border overflow-hidden max-w-5xl mx-auto">
          {/* Mock navbar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/50">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-warning/60" />
                <div className="w-3 h-3 rounded-full bg-success/60" />
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-background border border-border">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Backend IT Team</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20" />
            </div>
          </div>
          
          {/* Main content */}
          <div className="flex h-[400px] md:h-[450px]">
            {/* Sidebar */}
            <div className="hidden sm:block w-56 border-r border-border bg-sidebar p-3 space-y-1">
              <div className="text-xs font-semibold text-muted-foreground px-2 py-1">CHANNELS</div>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-primary/10 text-primary text-sm">
                <MessageSquare className="w-4 h-4" />
                general
              </div>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary text-sm text-muted-foreground">
                <MessageSquare className="w-4 h-4" />
                backend-squad
              </div>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary text-sm text-muted-foreground">
                <MessageSquare className="w-4 h-4" />
                releases
              </div>
              <div className="text-xs font-semibold text-muted-foreground px-2 py-1 mt-4">DIRECT MESSAGES</div>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary text-sm text-muted-foreground">
                <div className="w-5 h-5 rounded-full bg-accent/20" />
                Sarah K.
              </div>
            </div>
            
            {/* Chat area */}
            <div className="flex-1 flex flex-col">
              <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center text-xs font-semibold">JD</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">John Doe</span>
                      <span className="text-xs text-muted-foreground">10:32 AM</span>
                    </div>
                    <div className="bg-muted rounded-lg px-3 py-2 text-sm mt-1 max-w-xs">
                      Morning team! Anyone looked at the staging issues?
                    </div>
                  </div>
                </div>
                
                {messageVisible && (
                  <div className="flex items-start gap-3 animate-message-appear">
                    <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center text-xs font-semibold">SK</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">Sarah Kim</span>
                        <span className="text-xs text-muted-foreground">10:34 AM</span>
                      </div>
                      <div className="bg-muted rounded-lg px-3 py-2 text-sm mt-1 max-w-xs">
                        The login API is throwing 500 errors 😭 Need someone to look at it ASAP
                      </div>
                    </div>
                  </div>
                )}
                
                {taskVisible && (
                  <div className="animate-task-slide bg-accent/10 rounded-xl p-3 border border-accent/30 max-w-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-accent" />
                      <span className="text-xs font-medium text-accent">Orbix created a task</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border-2 border-primary" />
                      <span className="text-sm font-medium">Fix Login API 500 errors</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span className="px-2 py-0.5 rounded bg-destructive/20 text-destructive font-medium">P0</span>
                      <span>→ Assigned to Backend Team</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Input */}
              <div className="p-3 border-t border-border">
                <div className="flex items-center gap-2 bg-secondary rounded-xl px-4 py-2.5">
                  <input 
                    type="text" 
                    placeholder="Message #general" 
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    disabled
                  />
                  <Send className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </div>
            
            {/* Right panel - Tasks */}
            <div className="hidden lg:block w-64 border-l border-border bg-sidebar p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Today's Tasks</h3>
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2 p-2 rounded-lg bg-background border border-border">
                  <Check className="w-4 h-4 text-success mt-0.5" />
                  <div>
                    <p className="text-sm line-through text-muted-foreground">Update staging env</p>
                    <span className="text-xs text-muted-foreground">Completed</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-lg bg-background border border-border">
                  <div className="w-4 h-4 rounded border-2 border-primary mt-0.5" />
                  <div>
                    <p className="text-sm">Review PR #234</p>
                    <span className="text-xs text-muted-foreground">In Progress</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-lg bg-background border border-border">
                  <div className="w-4 h-4 rounded border-2 border-border mt-0.5" />
                  <div>
                    <p className="text-sm">API documentation</p>
                    <span className="text-xs text-muted-foreground">To Do</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ========================
// TESTIMONIALS SECTION
// ========================
const TestimonialsSection = () => {
  const testimonials = [
    { quote: "Orbix killed our standup chaos. Now we just... work.", author: "Alex Chen", role: "Engineering Lead" },
    { quote: "We stopped losing tasks in Slack. Finally, accountability without the overhead.", author: "Maria Garcia", role: "Product Manager" },
    { quote: "Assignment is finally fair and transparent. The team morale improved.", author: "James Wilson", role: "DevOps Lead" },
  ];

  return (
    <section className="py-20 px-6">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-muted-foreground mb-4">TRUSTED BY TEAMS</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">What teams are saying</h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-card rounded-2xl p-6 border border-border shadow-soft card-lift">
              <p className="text-lg mb-6">&ldquo;{testimonial.quote}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                  {testimonial.author.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <p className="font-semibold text-sm">{testimonial.author}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ========================
// CTA SECTION
// ========================
const CTASection = () => (
  <section className="py-20 px-6">
    <div className="container mx-auto">
      <div className="relative rounded-3xl bg-gradient-to-br from-primary/10 via-accent/5 to-secondary p-12 md:p-20 text-center overflow-hidden border border-border">
        <div className="absolute inset-0 concentric-circles opacity-50" />
        <div className="relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to turn your team's chaos into clarity?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join teams who've discovered the power of human-first AI collaboration.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth?mode=signup">
              <Button variant="hero" size="xl" className="group">
                Start free with your team
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button variant="outline" size="xl">
              Explore the product
            </Button>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// ========================
// FOOTER
// ========================
const Footer = () => (
  <footer className="py-12 px-6 border-t border-border">
    <div className="container mx-auto">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">Orbix</span>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Orbix — Human-first AI for teams.
        </p>
        
        <div className="flex items-center gap-6">
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</a>
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</a>
        </div>
      </div>
    </div>
  </footer>
);

export default Landing;
