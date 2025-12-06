import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  Users,
  Target,
  Brain,
  LayoutGrid,
  Shield,
  Check,
  Plus,
  X
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const steps = [
  { id: 1, title: "Name", description: "What should we call your workspace?" },
  { id: 2, title: "Purpose", description: "What type of team is this?" },
  { id: 3, title: "Invite", description: "Add your team members" },
  { id: 4, title: "AI Mode", description: "How should AI assist?" },
  { id: 5, title: "Workflow", description: "How does your team work?" },
  { id: 6, title: "Privacy", description: "Choose your culture mode" },
  { id: 7, title: "Launch", description: "Review and launch" },
];

const purposes = [
  { id: "it-team", label: "IT Team", icon: "💻" },
  { id: "project", label: "Project Team", icon: "📋" },
  { id: "client", label: "Client Work", icon: "🤝" },
  { id: "other", label: "Other", icon: "✨" },
];

const aiModes = [
  { 
    id: "assist", 
    label: "Assist Mode", 
    description: "AI only suggests, humans confirm everything",
    icon: Brain
  },
  { 
    id: "semi-auto", 
    label: "Semi-Auto", 
    description: "AI auto-assigns most tasks, asks when unsure",
    icon: Target
  },
  { 
    id: "full-auto", 
    label: "Full Auto", 
    description: "AI runs task detection & assignment (still overridable)",
    icon: Sparkles
  },
];

const workflowModes = [
  { id: "agile", label: "Agile", description: "Sprints, backlog, story points", icon: "🏃" },
  { id: "kanban", label: "Kanban", description: "Boards & continuous flow", icon: "📊" },
  { id: "hybrid", label: "Hybrid", description: "Both capabilities", icon: "🔄" },
  { id: "lite", label: "Lite", description: "Simple task list for small teams", icon: "✅" },
];

const cultureModes = [
  { 
    id: "open", 
    label: "Open", 
    description: "Transparent workloads & analytics for everyone",
    icon: Users
  },
  { 
    id: "semi-private", 
    label: "Semi-Private", 
    description: "Limited visibility, some insights shared",
    icon: Shield
  },
  { 
    id: "privacy-first", 
    label: "Privacy-First", 
    description: "Only leaders see detailed insights",
    icon: Shield
  },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    workspaceName: "",
    purpose: "",
    members: [] as string[],
    aiMode: "",
    workflowMode: "",
    cultureMode: "",
  });
  const [newMemberEmail, setNewMemberEmail] = useState("");

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAddMember = () => {
    if (newMemberEmail && !formData.members.includes(newMemberEmail)) {
      setFormData({ ...formData, members: [...formData.members, newMemberEmail] });
      setNewMemberEmail("");
    }
  };

  const handleRemoveMember = (email: string) => {
    setFormData({ ...formData, members: formData.members.filter((m) => m !== email) });
  };

  const handleLaunch = () => {
    toast.success("Workspace created successfully!");
    navigate("/app");
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.workspaceName.length > 0;
      case 2:
        return formData.purpose.length > 0;
      case 3:
        return true; // Optional step
      case 4:
        return formData.aiMode.length > 0;
      case 5:
        return formData.workflowMode.length > 0;
      case 6:
        return formData.cultureMode.length > 0;
      case 7:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Sidebar - Progress */}
      <div className="hidden lg:flex w-80 bg-secondary/30 border-r border-border p-8 flex-col">
        <div className="flex items-center gap-2 mb-12">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold gradient-text">Orbix</span>
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-medium text-muted-foreground mb-6">Setup Progress</h3>
          <div className="space-y-4">
            {steps.map((step) => (
              <div 
                key={step.id} 
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-all",
                  currentStep === step.id && "bg-primary/10",
                  currentStep > step.id && "opacity-60"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                  currentStep === step.id && "gradient-primary text-primary-foreground",
                  currentStep > step.id && "bg-success text-success-foreground",
                  currentStep < step.id && "bg-secondary text-muted-foreground"
                )}>
                  {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
                </div>
                <div>
                  <p className={cn(
                    "font-medium text-sm",
                    currentStep === step.id ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.title}
                  </p>
                  {currentStep === step.id && (
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-xl">
          {/* Mobile Progress */}
          <div className="lg:hidden mb-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">Step {currentStep} of {steps.length}</span>
              <div className="flex gap-1">
                {steps.map((step) => (
                  <div 
                    key={step.id}
                    className={cn(
                      "w-8 h-1 rounded-full transition-all",
                      currentStep >= step.id ? "gradient-primary" : "bg-secondary"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="animate-slide-up">
            {/* Step 1: Workspace Name */}
            {currentStep === 1 && (
              <div>
                <LayoutGrid className="w-12 h-12 text-primary mb-6" />
                <h1 className="text-3xl font-bold mb-2">Name your workspace</h1>
                <p className="text-muted-foreground mb-8">
                  Choose a name that represents your team or project.
                </p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="workspace-name">Workspace Name</Label>
                    <Input
                      id="workspace-name"
                      placeholder="e.g., Backend IT Team"
                      value={formData.workspaceName}
                      onChange={(e) => setFormData({ ...formData, workspaceName: e.target.value })}
                      className="text-lg h-12"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Purpose */}
            {currentStep === 2 && (
              <div>
                <Target className="w-12 h-12 text-primary mb-6" />
                <h1 className="text-3xl font-bold mb-2">What's this workspace for?</h1>
                <p className="text-muted-foreground mb-8">
                  This helps Orbix understand your team better.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {purposes.map((purpose) => (
                    <button
                      key={purpose.id}
                      onClick={() => setFormData({ ...formData, purpose: purpose.id })}
                      className={cn(
                        "p-6 rounded-xl border-2 text-left transition-all hover:shadow-soft",
                        formData.purpose === purpose.id 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <span className="text-3xl mb-3 block">{purpose.icon}</span>
                      <span className="font-medium">{purpose.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Invite Members */}
            {currentStep === 3 && (
              <div>
                <Users className="w-12 h-12 text-primary mb-6" />
                <h1 className="text-3xl font-bold mb-2">Invite your team</h1>
                <p className="text-muted-foreground mb-8">
                  Add team members by email. You can always add more later.
                </p>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="teammate@company.com"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleAddMember()}
                    />
                    <Button onClick={handleAddMember} variant="outline">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {formData.members.length > 0 && (
                    <div className="space-y-2">
                      {formData.members.map((email) => (
                        <div 
                          key={email}
                          className="flex items-center justify-between p-3 rounded-lg bg-secondary"
                        >
                          <span className="text-sm">{email}</span>
                          <button 
                            onClick={() => handleRemoveMember(email)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {formData.members.length === 0 
                      ? "You can skip this and add members later." 
                      : `${formData.members.length} member(s) will be invited.`}
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: AI Mode */}
            {currentStep === 4 && (
              <div>
                <Brain className="w-12 h-12 text-primary mb-6" />
                <h1 className="text-3xl font-bold mb-2">How should AI assist?</h1>
                <p className="text-muted-foreground mb-8">
                  Choose how much autonomy Orbix should have.
                </p>
                <div className="space-y-4">
                  {aiModes.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setFormData({ ...formData, aiMode: mode.id })}
                      className={cn(
                        "w-full p-5 rounded-xl border-2 text-left transition-all hover:shadow-soft flex items-start gap-4",
                        formData.aiMode === mode.id 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                        formData.aiMode === mode.id ? "gradient-primary text-primary-foreground" : "bg-secondary"
                      )}>
                        <mode.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-medium block mb-1">{mode.label}</span>
                        <span className="text-sm text-muted-foreground">{mode.description}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5: Workflow Mode */}
            {currentStep === 5 && (
              <div>
                <LayoutGrid className="w-12 h-12 text-primary mb-6" />
                <h1 className="text-3xl font-bold mb-2">Choose your workflow</h1>
                <p className="text-muted-foreground mb-8">
                  How does your team prefer to work?
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {workflowModes.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setFormData({ ...formData, workflowMode: mode.id })}
                      className={cn(
                        "p-5 rounded-xl border-2 text-left transition-all hover:shadow-soft",
                        formData.workflowMode === mode.id 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <span className="text-2xl mb-2 block">{mode.icon}</span>
                      <span className="font-medium block mb-1">{mode.label}</span>
                      <span className="text-xs text-muted-foreground">{mode.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 6: Culture Mode */}
            {currentStep === 6 && (
              <div>
                <Shield className="w-12 h-12 text-primary mb-6" />
                <h1 className="text-3xl font-bold mb-2">Set your culture</h1>
                <p className="text-muted-foreground mb-8">
                  How open should team insights be?
                </p>
                <div className="space-y-4">
                  {cultureModes.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setFormData({ ...formData, cultureMode: mode.id })}
                      className={cn(
                        "w-full p-5 rounded-xl border-2 text-left transition-all hover:shadow-soft flex items-start gap-4",
                        formData.cultureMode === mode.id 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                        formData.cultureMode === mode.id ? "gradient-primary text-primary-foreground" : "bg-secondary"
                      )}>
                        <mode.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-medium block mb-1">{mode.label}</span>
                        <span className="text-sm text-muted-foreground">{mode.description}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 7: Summary */}
            {currentStep === 7 && (
              <div>
                <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-6 glow-primary">
                  <Sparkles className="w-8 h-8 text-primary-foreground" />
                </div>
                <h1 className="text-3xl font-bold mb-2">Ready to launch!</h1>
                <p className="text-muted-foreground mb-8">
                  Here's a summary of your workspace settings.
                </p>
                <div className="space-y-4 bg-secondary/50 rounded-xl p-6">
                  <SummaryItem label="Workspace" value={formData.workspaceName} />
                  <SummaryItem label="Purpose" value={purposes.find(p => p.id === formData.purpose)?.label || "-"} />
                  <SummaryItem label="Team Size" value={`${formData.members.length + 1} member(s)`} />
                  <SummaryItem label="AI Mode" value={aiModes.find(m => m.id === formData.aiMode)?.label || "-"} />
                  <SummaryItem label="Workflow" value={workflowModes.find(m => m.id === formData.workflowMode)?.label || "-"} />
                  <SummaryItem label="Culture" value={cultureModes.find(m => m.id === formData.cultureMode)?.label || "-"} />
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-10">
            <Button 
              variant="ghost" 
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            
            {currentStep < steps.length ? (
              <Button 
                variant="hero" 
                onClick={handleNext}
                disabled={!canProceed()}
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                variant="hero" 
                onClick={handleLaunch}
              >
                Launch Workspace
                <Sparkles className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SummaryItem = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

export default Onboarding;
