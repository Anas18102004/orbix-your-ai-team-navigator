import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Building2,
  LayoutGrid,
  UserPlus,
  Clock,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Welcome = () => {
  const navigate = useNavigate();
  const { refreshWorkspaces } = useApp();
  const [loading, setLoading] = useState<string | null>(null);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceDescription, setWorkspaceDescription] = useState("");

  const handleCreateOrganization = async () => {
    if (!orgName.trim()) {
      toast.error("Organization name is required");
      return;
    }

    try {
      setLoading("org");
      const result = await apiClient.createOrganization({ name: orgName });
      toast.success("Organization created successfully!");
      setShowCreateOrg(false);
      setOrgName("");
      // Navigate to Org Admin Dashboard
      navigate("/app/org-admin");
    } catch (error: any) {
      toast.error(error.message || "Failed to create organization");
    } finally {
      setLoading(null);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!workspaceName.trim() || !workspaceDescription.trim()) {
      toast.error("Workspace name and description are required");
      return;
    }

    try {
      setLoading("workspace");
      const result = await apiClient.createWorkspace({
        name: workspaceName,
        description: workspaceDescription,
      });
      toast.success("Workspace created successfully!");
      setShowCreateWorkspace(false);
      setWorkspaceName("");
      setWorkspaceDescription("");
      await refreshWorkspaces();
      // Navigate directly to Project Definition Wizard
      navigate(`/project-wizard/${result.workspace._id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create workspace");
    } finally {
      setLoading(null);
    }
  };

  const handleJoinWorkspace = () => {
    navigate("/join-workspace");
  };

  const handleContinueWithoutWorkspace = () => {
    navigate("/app");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold gradient-text">Welcome to Orbix</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Choose how you'd like to get started
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Card 1: Create Organization */}
          <div className="bg-card border rounded-xl p-6 hover:border-primary/50 transition-all cursor-pointer group">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">Create Organization</h3>
                <p className="text-muted-foreground mb-4">
                  Create a new organization and become an Org Admin. You'll be able to create workspaces and manage team members across your organization.
                </p>
                <Button
                  onClick={() => setShowCreateOrg(true)}
                  className="w-full"
                  variant="default"
                >
                  Create Organization
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>

          {/* Card 2: Create Workspace */}
          <div className="bg-card border rounded-xl p-6 hover:border-primary/50 transition-all cursor-pointer group">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <LayoutGrid className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">Create Workspace</h3>
                <p className="text-muted-foreground mb-4">
                  Start a new workspace. You'll be assigned as Omni (leader) and can begin setting up your project.
                </p>
                <Button
                  onClick={() => setShowCreateWorkspace(true)}
                  className="w-full"
                  variant="default"
                >
                  Create Workspace
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>

          {/* Card 3: Join Workspace */}
          <div className="bg-card border rounded-xl p-6 hover:border-primary/50 transition-all cursor-pointer group">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <UserPlus className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">Join Workspace</h3>
                <p className="text-muted-foreground mb-4">
                  Accept an invitation to join an existing workspace using an invite code or link.
                </p>
                <Button
                  onClick={handleJoinWorkspace}
                  className="w-full"
                  variant="outline"
                >
                  Join Workspace
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>

          {/* Card 4: Continue Without Workspace */}
          <div className="bg-card border rounded-xl p-6 hover:border-primary/50 transition-all cursor-pointer group">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">Continue Without Workspace</h3>
                <p className="text-muted-foreground mb-4">
                  Wait for an invitation. You can explore the app, but you'll need to join a workspace to access full features.
                </p>
                <Button
                  onClick={handleContinueWithoutWorkspace}
                  className="w-full"
                  variant="outline"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Create Organization Dialog */}
        <Dialog open={showCreateOrg} onOpenChange={setShowCreateOrg}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Organization</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="My Organization"
                  className="mt-2"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateOrg(false);
                    setOrgName("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateOrganization}
                  disabled={loading === "org" || !orgName.trim()}
                >
                  {loading === "org" ? "Creating..." : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Workspace Dialog */}
        <Dialog open={showCreateWorkspace} onOpenChange={setShowCreateWorkspace}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Workspace</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="workspaceName">Workspace Name</Label>
                <Input
                  id="workspaceName"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="My Workspace"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="workspaceDescription">Description</Label>
                <Textarea
                  id="workspaceDescription"
                  value={workspaceDescription}
                  onChange={(e) => setWorkspaceDescription(e.target.value)}
                  placeholder="Brief description of your workspace"
                  className="mt-2"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateWorkspace(false);
                    setWorkspaceName("");
                    setWorkspaceDescription("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateWorkspace}
                  disabled={
                    loading === "workspace" ||
                    !workspaceName.trim() ||
                    !workspaceDescription.trim()
                  }
                >
                  {loading === "workspace" ? "Creating..." : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Welcome;

