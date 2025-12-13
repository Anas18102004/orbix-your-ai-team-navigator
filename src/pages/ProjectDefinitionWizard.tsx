import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Target,
  Brain,
  Calendar,
  Code,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";
import { useApp } from "@/contexts/AppContext";

const steps = [
  { id: 1, title: "Basics", description: "Project name and type" },
  { id: 2, title: "Goals", description: "What are we building?" },
  { id: 3, title: "Timeline", description: "When do we need it?" },
  { id: 4, title: "Tech Stack", description: "What technologies?" },
  { id: 5, title: "Risks", description: "Constraints and priorities" },
  { id: 6, title: "Work Style", description: "How we collaborate" },
  { id: 7, title: "AI Mode", description: "AI automation preference" },
];

const projectTypes = [
  { id: "Greenfield", label: "Greenfield", description: "New project from scratch" },
  { id: "Maintenance", label: "Maintenance", description: "Ongoing support and updates" },
  { id: "Migration", label: "Migration", description: "Moving to new system" },
  { id: "Ops", label: "Ops", description: "Infrastructure and operations" },
];

const domainTags = [
  "Fintech", "E-commerce", "Internal Tools", "Infrastructure",
  "Healthcare", "Education", "SaaS", "Mobile App", "Web App", "API"
];

const workflows = [
  { id: "Agile", label: "Agile", description: "Sprints and iterations" },
  { id: "Kanban", label: "Kanban", description: "Continuous flow" },
  { id: "Ad-hoc", label: "Ad-hoc", description: "Flexible approach" },
];

const collaborationStyles = [
  { id: "Mostly async", label: "Mostly Async", description: "Async communication preferred" },
  { id: "Daily standups", label: "Daily Standups", description: "Daily sync meetings" },
  { id: "Weekly syncs", label: "Weekly Syncs", description: "Weekly coordination" },
];

const aiModes = [
  {
    id: "assist",
    label: "Assist Mode",
    description: "AI only suggests, humans confirm everything",
    icon: Brain
  },
  {
    id: "semi_auto",
    label: "Semi-Auto",
    description: "AI auto-assigns most tasks, asks when unsure",
    icon: Target
  },
  {
    id: "full_auto",
    label: "Full Auto",
    description: "AI runs task detection & assignment",
    icon: Sparkles
  },
];

const ProjectDefinitionWizard = () => {
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { currentWorkspace, refreshWorkspaces } = useApp();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    projectType: "" as "Greenfield" | "Maintenance" | "Migration" | "Ops" | "",
    domainTags: [] as string[],
    goalOneLine: "",
    topOutcomes: ["", "", ""] as [string, string, string],
    inScope: [] as string[],
    outOfScope: [] as string[],
    targetEndDate: "",
    duration: "",
    milestones: [] as Array<{ name: string; targetDate: string }>,
    frontendStack: [] as string[],
    backendStack: [] as string[],
    infraStack: [] as string[],
    speedStabilityCostBias: { speed: 33, stability: 33, cost: 34 },
    deadlineFlexibility: "" as "Flexible" | "Somewhat Flexible" | "Fixed" | "",
    criticalModules: [] as string[],
    workflow: "" as "Agile" | "Kanban" | "Ad-hoc" | "",
    automationMode: "" as "assist" | "semi_auto" | "full_auto" | "",
    cultureMode: "" as "open" | "semi_private" | "privacy_first" | "",
  });

  const [newInScope, setNewInScope] = useState("");
  const [newOutOfScope, setNewOutOfScope] = useState("");
  const [newFrontendTech, setNewFrontendTech] = useState("");
  const [newBackendTech, setNewBackendTech] = useState("");
  const [newInfraPlatform, setNewInfraPlatform] = useState("");
  const [newCriticalModule, setNewCriticalModule] = useState("");
  const [newMilestoneName, setNewMilestoneName] = useState("");
  const [newMilestoneDate, setNewMilestoneDate] = useState("");

  const handleNext = () => {
    if (currentStep < steps.length && canProceed()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.projectType !== "";
      case 2:
        return formData.goalOneLine.trim() !== "" &&
          formData.topOutcomes.every(o => o.trim() !== "");
      case 3:
        return true; // Timeline is optional
      case 4:
        return true; // Tech stack is optional but recommended
      case 5:
        return formData.deadlineFlexibility !== "";
      case 6:
        return formData.workflow !== "";
      case 7:
        return formData.automationMode !== "" && formData.cultureMode !== "";
      default:
        return false;
    }
  };

  const suggestAIMode = (): "assist" | "semi_auto" | "full_auto" => {
    // Simple heuristic based on project type and workflow
    if (formData.projectType === "Maintenance" || formData.workflow === "Ad-hoc") {
      return "assist";
    }
    if (formData.projectType === "Greenfield" && formData.workflow === "Agile") {
      return "semi_auto";
    }
    return "assist"; // Default
  };

  const suggestCultureMode = (): "open" | "semi_private" | "privacy_first" => {
    // Default to open for most cases
    return "open";
  };

  const handleSubmit = async () => {
    if (!workspaceId) {
      toast.error("Workspace ID is required");
      return;
    }

    try {
      setLoading(true);

      // Prepare project profile according to new structure
      const projectProfile = {
        projectType: formData.projectType,
        domainTags: formData.domainTags,
        goalOneLine: formData.goalOneLine,
        topOutcomes: formData.topOutcomes.filter(o => o.trim() !== ""),
        inScope: formData.inScope,
        outOfScope: formData.outOfScope,
        targetEndDate: formData.targetEndDate ? new Date(formData.targetEndDate).toISOString() : undefined,
        milestones: formData.milestones.map(m => ({
          name: m.name,
          targetDate: new Date(m.targetDate).toISOString()
        })),
        frontendStack: formData.frontendStack,
        backendStack: formData.backendStack,
        infraStack: formData.infraStack,
        speedStabilityCostBias: formData.speedStabilityCostBias,
        deadlineFlexibility: formData.deadlineFlexibility,
        criticalModules: formData.criticalModules,
        workflow: formData.workflow,
      };

      const aiSettings = {
        automationMode: formData.automationMode || suggestAIMode(),
        cultureMode: formData.cultureMode || suggestCultureMode(),
      };

      await apiClient.saveProjectProfile(workspaceId, { 
        projectProfile,
        aiSettings 
      });

      toast.success("Project profile saved successfully!");
      await refreshWorkspaces();
      navigate(`/app`);
    } catch (error: any) {
      toast.error(error.message || "Failed to save project profile");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label>Project Type</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                {projectTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, projectType: type.id as any })}
                    className={cn(
                      "p-4 border-2 rounded-lg text-left transition-all",
                      formData.projectType === type.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="font-medium">{type.label}</div>
                    <div className="text-sm text-muted-foreground mt-1">{type.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Domain Tags</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {domainTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      const tags = formData.domainTags.includes(tag)
                        ? formData.domainTags.filter(t => t !== tag)
                        : [...formData.domainTags, tag];
                      setFormData({ ...formData, domainTags: tags });
                    }}
                    className={cn(
                      "px-3 py-1 rounded-full text-sm border transition-all",
                      formData.domainTags.includes(tag)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:border-primary"
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="goalOneLine">One-Line Goal</Label>
              <Textarea
                id="goalOneLine"
                value={formData.goalOneLine}
                onChange={(e) => setFormData({ ...formData, goalOneLine: e.target.value })}
                placeholder="One-line description of what we're building..."
                className="mt-2"
                rows={3}
              />
            </div>

            <div>
              <Label>Top 3 Outcomes</Label>
              {formData.topOutcomes.map((outcome, idx) => (
                <Input
                  key={idx}
                  value={outcome}
                  onChange={(e) => {
                    const newOutcomes = [...formData.topOutcomes];
                    newOutcomes[idx] = e.target.value;
                    setFormData({ ...formData, topOutcomes: newOutcomes as [string, string, string] });
                  }}
                  placeholder={`Outcome ${idx + 1}`}
                  className="mt-2"
                />
              ))}
            </div>

            <div>
              <Label>In Scope (Optional)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newInScope}
                  onChange={(e) => setNewInScope(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && newInScope.trim()) {
                      setFormData({ ...formData, inScope: [...formData.inScope, newInScope.trim()] });
                      setNewInScope("");
                    }
                  }}
                  placeholder="Add in-scope item"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (newInScope.trim()) {
                      setFormData({ ...formData, inScope: [...formData.inScope, newInScope.trim()] });
                      setNewInScope("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.inScope.map((item, idx) => (
                  <span key={idx} className="px-3 py-1 bg-muted rounded-full text-sm flex items-center gap-2">
                    {item}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, inScope: formData.inScope.filter((_, i) => i !== idx) });
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <Label>Out of Scope (Optional)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newOutOfScope}
                  onChange={(e) => setNewOutOfScope(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && newOutOfScope.trim()) {
                      setFormData({ ...formData, outOfScope: [...formData.outOfScope, newOutOfScope.trim()] });
                      setNewOutOfScope("");
                    }
                  }}
                  placeholder="Add out-of-scope item"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (newOutOfScope.trim()) {
                      setFormData({ ...formData, outOfScope: [...formData.outOfScope, newOutOfScope.trim()] });
                      setNewOutOfScope("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.outOfScope.map((item, idx) => (
                  <span key={idx} className="px-3 py-1 bg-muted rounded-full text-sm flex items-center gap-2">
                    {item}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, outOfScope: formData.outOfScope.filter((_, i) => i !== idx) });
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="targetEndDate">Target End Date (Optional)</Label>
                <Input
                  id="targetEndDate"
                  type="date"
                  value={formData.targetEndDate}
                  onChange={(e) => setFormData({ ...formData, targetEndDate: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="duration">Duration (Optional)</Label>
                <Input
                  id="duration"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="e.g., 3 months"
                  className="mt-2"
                />
              </div>
            </div>

            <div>
              <Label>Key Milestones (Optional)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newMilestoneName}
                  onChange={(e) => setNewMilestoneName(e.target.value)}
                  placeholder="Milestone name"
                />
                <Input
                  type="date"
                  value={newMilestoneDate}
                  onChange={(e) => setNewMilestoneDate(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (newMilestoneName.trim() && newMilestoneDate) {
                      setFormData({
                        ...formData,
                        milestones: [...formData.milestones, { name: newMilestoneName.trim(), targetDate: newMilestoneDate }]
                      });
                      setNewMilestoneName("");
                      setNewMilestoneDate("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
              <div className="space-y-2 mt-2">
                {formData.milestones.map((milestone, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm">{milestone.name} - {new Date(milestone.targetDate).toLocaleDateString()}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, milestones: formData.milestones.filter((_, i) => i !== idx) });
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <Label>Frontend Technologies</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newFrontendTech}
                  onChange={(e) => setNewFrontendTech(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && newFrontendTech.trim()) {
                      setFormData({ ...formData, frontendStack: [...formData.frontendStack, newFrontendTech.trim()] });
                      setNewFrontendTech("");
                    }
                  }}
                  placeholder="e.g., React, Vue, Angular"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (newFrontendTech.trim()) {
                      setFormData({ ...formData, frontendStack: [...formData.frontendStack, newFrontendTech.trim()] });
                      setNewFrontendTech("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.frontendStack.map((tech, idx) => (
                  <span key={idx} className="px-3 py-1 bg-muted rounded-full text-sm flex items-center gap-2">
                    {tech}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, frontendStack: formData.frontendStack.filter((_, i) => i !== idx) });
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <Label>Backend Technologies</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newBackendTech}
                  onChange={(e) => setNewBackendTech(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && newBackendTech.trim()) {
                      setFormData({ ...formData, backendStack: [...formData.backendStack, newBackendTech.trim()] });
                      setNewBackendTech("");
                    }
                  }}
                  placeholder="e.g., Node.js, Python, Java"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (newBackendTech.trim()) {
                      setFormData({ ...formData, backendStack: [...formData.backendStack, newBackendTech.trim()] });
                      setNewBackendTech("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.backendStack.map((tech, idx) => (
                  <span key={idx} className="px-3 py-1 bg-muted rounded-full text-sm flex items-center gap-2">
                    {tech}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, backendStack: formData.backendStack.filter((_, i) => i !== idx) });
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <Label>Infrastructure/Platforms</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newInfraPlatform}
                  onChange={(e) => setNewInfraPlatform(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && newInfraPlatform.trim()) {
                      setFormData({ ...formData, infraStack: [...formData.infraStack, newInfraPlatform.trim()] });
                      setNewInfraPlatform("");
                    }
                  }}
                  placeholder="e.g., AWS, Docker, Kubernetes"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (newInfraPlatform.trim()) {
                      setFormData({ ...formData, infraStack: [...formData.infraStack, newInfraPlatform.trim()] });
                      setNewInfraPlatform("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.infraStack.map((platform, idx) => (
                  <span key={idx} className="px-3 py-1 bg-muted rounded-full text-sm flex items-center gap-2">
                    {platform}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, infraStack: formData.infraStack.filter((_, i) => i !== idx) });
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <Label>Speed ↔ Stability ↔ Cost Emphasis</Label>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Speed</span>
                    <span className="text-sm font-medium">{formData.speedStabilityCostBias.speed}%</span>
                  </div>
                  <Slider
                    value={[formData.speedStabilityCostBias.speed]}
                    onValueChange={(value) => {
                      const remaining = 100 - value[0];
                      const stability = Math.round(remaining * (formData.speedStabilityCostBias.stability / (formData.speedStabilityCostBias.stability + formData.speedStabilityCostBias.cost)));
                      const cost = remaining - stability;
                      setFormData({ 
                        ...formData, 
                        speedStabilityCostBias: { speed: value[0], stability, cost } 
                      });
                    }}
                    min={0}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Stability</span>
                    <span className="text-sm font-medium">{formData.speedStabilityCostBias.stability}%</span>
                  </div>
                  <Slider
                    value={[formData.speedStabilityCostBias.stability]}
                    onValueChange={(value) => {
                      const remaining = 100 - value[0];
                      const speed = Math.round(remaining * (formData.speedStabilityCostBias.speed / (formData.speedStabilityCostBias.speed + formData.speedStabilityCostBias.cost)));
                      const cost = remaining - speed;
                      setFormData({ 
                        ...formData, 
                        speedStabilityCostBias: { speed, stability: value[0], cost } 
                      });
                    }}
                    min={0}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Cost</span>
                    <span className="text-sm font-medium">{formData.speedStabilityCostBias.cost}%</span>
                  </div>
                  <Slider
                    value={[formData.speedStabilityCostBias.cost]}
                    onValueChange={(value) => {
                      const remaining = 100 - value[0];
                      const speed = Math.round(remaining * (formData.speedStabilityCostBias.speed / (formData.speedStabilityCostBias.speed + formData.speedStabilityCostBias.stability)));
                      const stability = remaining - speed;
                      setFormData({ 
                        ...formData, 
                        speedStabilityCostBias: { speed, stability, cost: value[0] } 
                      });
                    }}
                    min={0}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Deadline Flexibility</Label>
              <div className="grid grid-cols-3 gap-4 mt-2">
                {(["Flexible", "Somewhat Flexible", "Fixed"] as const).map((flex) => (
                  <button
                    key={flex}
                    type="button"
                    onClick={() => setFormData({ ...formData, deadlineFlexibility: flex })}
                    className={cn(
                      "p-4 border-2 rounded-lg text-center transition-all",
                      formData.deadlineFlexibility === flex
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {flex}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Critical Modules (Optional)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newCriticalModule}
                  onChange={(e) => setNewCriticalModule(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && newCriticalModule.trim()) {
                      setFormData({ ...formData, criticalModules: [...formData.criticalModules, newCriticalModule.trim()] });
                      setNewCriticalModule("");
                    }
                  }}
                  placeholder="e.g., Payment, Auth, Data Processing"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (newCriticalModule.trim()) {
                      setFormData({ ...formData, criticalModules: [...formData.criticalModules, newCriticalModule.trim()] });
                      setNewCriticalModule("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.criticalModules.map((module, idx) => (
                  <span key={idx} className="px-3 py-1 bg-muted rounded-full text-sm flex items-center gap-2">
                    {module}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, criticalModules: formData.criticalModules.filter((_, i) => i !== idx) });
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div>
              <Label>Workflow</Label>
              <div className="grid grid-cols-3 gap-4 mt-2">
                {workflows.map((wf) => (
                  <button
                    key={wf.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, workflow: wf.id as any })}
                    className={cn(
                      "p-4 border-2 rounded-lg text-left transition-all",
                      formData.workflow === wf.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="font-medium">{wf.label}</div>
                    <div className="text-sm text-muted-foreground mt-1">{wf.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 7:
        const suggestedMode = suggestAIMode();
        const cultureModes = [
          {
            id: "open",
            label: "Open",
            description: "Transparent communication, all team members can see everything"
          },
          {
            id: "semi_private",
            label: "Semi-Private",
            description: "Some information is private, but most is shared"
          },
          {
            id: "privacy_first",
            label: "Privacy First",
            description: "Minimal sharing, information is kept private by default"
          }
        ];
        return (
          <div className="space-y-6">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-start gap-3">
                <Brain className="w-5 h-5 mt-0.5 text-primary" />
                <div>
                  <div className="font-medium">Suggested AI Mode</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Based on your project type ({formData.projectType}) and workflow ({formData.workflow}),
                    we recommend <strong>{aiModes.find(m => m.id === suggestedMode)?.label}</strong>.
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label>Select AI Automation Mode</Label>
              <div className="grid grid-cols-1 gap-4 mt-2">
                {aiModes.map((mode) => {
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, automationMode: mode.id as any })}
                      className={cn(
                        "p-4 border-2 rounded-lg text-left transition-all flex items-start gap-3",
                        formData.automationMode === mode.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="font-medium">{mode.label}</div>
                        <div className="text-sm text-muted-foreground mt-1">{mode.description}</div>
                      </div>
                      {formData.automationMode === mode.id && (
                        <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label>Select Culture Mode</Label>
              <div className="grid grid-cols-1 gap-4 mt-2">
                {cultureModes.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, cultureMode: mode.id as any })}
                    className={cn(
                      "p-4 border-2 rounded-lg text-left transition-all",
                      formData.cultureMode === mode.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="font-medium">{mode.label}</div>
                    <div className="text-sm text-muted-foreground mt-1">{mode.description}</div>
                    {formData.cultureMode === mode.id && (
                      <CheckCircle2 className="w-5 h-5 text-primary mt-2" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold">Project Definition</h1>
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of {steps.length}
            </span>
          </div>
          <div className="flex gap-2">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className={cn(
                  "flex-1 h-2 rounded-full transition-all",
                  idx + 1 <= currentStep ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-card border rounded-lg p-8 mb-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">{steps[currentStep - 1].title}</h2>
            <p className="text-muted-foreground mt-1">{steps[currentStep - 1].description}</p>
          </div>

          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
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
              variant="default"
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              variant="default"
              onClick={handleSubmit}
              disabled={!canProceed() || loading}
            >
              {loading ? "Saving..." : "Complete Setup"}
              <Sparkles className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDefinitionWizard;

