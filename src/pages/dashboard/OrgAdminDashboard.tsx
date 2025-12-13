import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  LayoutGrid,
  Users,
  UserPlus,
  Settings,
  Plus,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Organization {
  _id: string;
  name: string;
  createdBy: string;
  createdAt: string;
}

interface Workspace {
  _id: string;
  name: string;
  description: string;
  omniCount: number;
  crewCount: number;
  totalMembers: number;
  hasProjectProfile: boolean;
}

const OrgAdminDashboard = () => {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceDescription, setWorkspaceDescription] = useState("");

  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      loadWorkspaces(selectedOrg._id);
    }
  }, [selectedOrg]);

  const loadOrganizations = async () => {
    try {
      const result = await apiClient.getOrganizations();
      setOrganizations(result.organizations);
      if (result.organizations.length > 0) {
        setSelectedOrg(result.organizations[0]);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load organizations");
    } finally {
      setLoading(false);
    }
  };

  const loadWorkspaces = async (orgId: string) => {
    try {
      const result = await apiClient.getOrganization(orgId);
      setWorkspaces(result.workspaces || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load workspaces");
    }
  };

  const handleCreateWorkspace = async () => {
    if (!workspaceName.trim() || !workspaceDescription.trim()) {
      toast.error("Workspace name and description are required");
      return;
    }

    if (!selectedOrg) {
      toast.error("Please select an organization first");
      return;
    }

    try {
      const result = await apiClient.createWorkspace({
        name: workspaceName,
        description: workspaceDescription,
        orgId: selectedOrg._id,
      });
      toast.success("Workspace created successfully!");
      setShowCreateWorkspace(false);
      setWorkspaceName("");
      setWorkspaceDescription("");
      await loadWorkspaces(selectedOrg._id);
      // Navigate to Project Definition Wizard
      navigate(`/project-wizard/${result.workspace._id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create workspace");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>No Organizations</CardTitle>
              <CardDescription>
                You don't have any organizations yet. Create one to get started.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/welcome")}>
                <Plus className="w-4 h-4 mr-2" />
                Create Organization
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Organization Admin</h1>
              <p className="text-muted-foreground">
                Manage your organization and workspaces
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/app/chatbot">
                <Button variant="gradient" className="shadow-lg hover:shadow-xl transition-shadow">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Orbix Chatbot
                </Button>
              </Link>
              <Button onClick={() => setShowCreateWorkspace(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Workspace
              </Button>
            </div>
          </div>
        </div>

        {/* Organization Selector */}
        {organizations.length > 1 && (
          <div className="mb-6">
            <Label>Select Organization</Label>
            <div className="flex gap-2 mt-2">
              {organizations.map((org) => (
                <Button
                  key={org._id}
                  variant={selectedOrg?._id === org._id ? "default" : "outline"}
                  onClick={() => setSelectedOrg(org)}
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  {org.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Workspaces Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((workspace) => (
            <Card key={workspace._id} className="hover:border-primary/50 transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="mb-1">{workspace.name}</CardTitle>
                    <CardDescription>{workspace.description}</CardDescription>
                  </div>
                  <LayoutGrid className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Omnis</span>
                    <span className="font-medium">{workspace.omniCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Crew</span>
                    <span className="font-medium">{workspace.crewCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Members</span>
                    <span className="font-medium">{workspace.totalMembers}</span>
                  </div>
                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Project Profile</span>
                      <span className={workspace.hasProjectProfile ? "text-green-600" : "text-yellow-600"}>
                        {workspace.hasProjectProfile ? "Complete" : "Pending"}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => navigate(`/app?workspace=${workspace._id}`)}
                    >
                      View Workspace
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {workspaces.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <LayoutGrid className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Workspaces Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first workspace to get started
              </p>
              <Button onClick={() => setShowCreateWorkspace(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Workspace
              </Button>
            </CardContent>
          </Card>
        )}

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
                  disabled={!workspaceName.trim() || !workspaceDescription.trim()}
                >
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default OrgAdminDashboard;

