import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Mail, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";

interface InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId?: string;
  orgId?: string;
  isOrgAdmin?: boolean;
  onSuccess?: () => void;
}

const specializations = [
  { value: "backend", label: "Backend Developer" },
  { value: "frontend", label: "Frontend Developer" },
  { value: "qa", label: "QA Engineer" },
  { value: "devops", label: "DevOps Engineer" },
  { value: "pm", label: "Product Manager" },
  { value: "design", label: "Designer" },
];

export const InviteModal = ({
  open,
  onOpenChange,
  workspaceId,
  orgId,
  isOrgAdmin = false,
  onSuccess,
}: InviteModalProps) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [inviteTarget, setInviteTarget] = useState<"org_admin" | "omni" | "crew" | "">("");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(workspaceId || "");
  const [specialization, setSpecialization] = useState<string | "pending">("");
  const [loading, setLoading] = useState(false);

  // For org admins we let them choose the target; for omnis we always invite crew members
  const effectiveInviteTarget: "org_admin" | "omni" | "crew" =
    isOrgAdmin ? (inviteTarget || "crew") : "crew";

  const handleSubmit = async () => {
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    if (isOrgAdmin && step === 1 && !inviteTarget) {
      toast.error("Please select an invite target");
      return;
    }

    // For Omni users, workspaceId is already set, so skip this check
    if (isOrgAdmin && (inviteTarget === "omni" || inviteTarget === "crew") && !selectedWorkspaceId) {
      toast.error("Please select a workspace");
      return;
    }

    // For Omni users or crew invites, specialization is required
    if ((effectiveInviteTarget === "crew" || !isOrgAdmin) && !specialization) {
      toast.error("Please select a specialization or choose 'Decide later'");
      return;
    }

    try {
      setLoading(true);

      let invitedRole: "org_admin" | "omni" | "crew";
      let invitedSpecialization: string | null = null;
      let roleDecisionMode: "fixed" | "pending" = "fixed";

      if (effectiveInviteTarget === "org_admin") {
        invitedRole = "org_admin";
      } else if (effectiveInviteTarget === "omni") {
        invitedRole = "omni";
      } else {
        // crew
        invitedRole = "crew";
        if (specialization === "pending") {
          roleDecisionMode = "pending";
        } else {
          invitedSpecialization = specialization as any;
        }
      }

      await apiClient.createInviteAdvanced({
        email: email.trim(),
        invitedRole,
        invitedSpecialization,
        roleDecisionMode,
        workspaceId: selectedWorkspaceId || workspaceId || undefined,
        orgId: orgId || undefined,
      });

      toast.success("Invite sent successfully!");
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to send invite");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setEmail("");
    setInviteTarget("");
    setSelectedWorkspaceId(workspaceId || "");
    setSpecialization("");
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onOpenChange(false);
    }
  };

  // For Omni users, skip step 1 and 2, go directly to step 3 (crew selection)
  const effectiveStep = !isOrgAdmin ? 3 : step;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            {isOrgAdmin
              ? "Invite someone to your organization or workspace"
              : "Invite a crew member to your workspace"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: Choose invite target (Org Admin only) */}
          {effectiveStep === 1 && isOrgAdmin && (
            <div className="space-y-4">
              <Label>Choose invite target</Label>
              <RadioGroup value={inviteTarget} onValueChange={(v) => setInviteTarget(v as any)}>
                <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent/50 cursor-pointer">
                  <RadioGroupItem value="org_admin" id="org_admin" />
                  <Label htmlFor="org_admin" className="cursor-pointer flex-1">
                    Invite as Org Admin (org-level)
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent/50 cursor-pointer">
                  <RadioGroupItem value="omni" id="omni" />
                  <Label htmlFor="omni" className="cursor-pointer flex-1">
                    Invite as Omni to a workspace
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent/50 cursor-pointer">
                  <RadioGroupItem value="crew" id="crew" />
                  <Label htmlFor="crew" className="cursor-pointer flex-1">
                    Invite as Crew to a workspace
                  </Label>
                </div>
              </RadioGroup>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose} disabled={loading}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (inviteTarget === "org_admin") {
                      setStep(3); // Skip workspace selection
                    } else if (inviteTarget) {
                      setStep(2);
                    }
                  }}
                  disabled={!inviteTarget}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Workspace selection (Org Admin only, for Omni/Crew) */}
          {effectiveStep === 2 && isOrgAdmin && (inviteTarget === "omni" || inviteTarget === "crew") && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="workspace">Select Workspace</Label>
                <Select value={selectedWorkspaceId} onValueChange={setSelectedWorkspaceId}>
                  <SelectTrigger id="workspace" className="mt-2">
                    <SelectValue placeholder="Choose a workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* TODO: Load workspaces from API */}
                    <SelectItem value={workspaceId || ""}>
                      Current Workspace
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStep(1)} disabled={loading}>
                  Back
                </Button>
                <Button onClick={() => setStep(3)} disabled={!selectedWorkspaceId}>
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Email and specialization */}
          {effectiveStep === 3 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2"
                  disabled={loading}
                />
              </div>

              {/* Show specialization selector only for crew invites */}
              {(effectiveInviteTarget === "crew" || !isOrgAdmin) && (
                <div>
                  <Label>Specialization</Label>
                  <Select value={specialization} onValueChange={setSpecialization}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select specialization" />
                    </SelectTrigger>
                    <SelectContent>
                      {specializations.map((spec) => (
                        <SelectItem key={spec.value} value={spec.value}>
                          {spec.label}
                        </SelectItem>
                      ))}
                      <SelectItem value="pending">
                        🔹 Decide later (pending role)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {!isOrgAdmin
                      ? "Choose 'Decide later' if you're not sure yet"
                      : "Choose 'Decide later' to let the member decide their specialization after joining"}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                {isOrgAdmin && step > 1 && (
                  <Button variant="outline" onClick={() => setStep(step - 1)} disabled={loading}>
                    Back
                  </Button>
                )}
                <Button onClick={handleSubmit} disabled={loading || !email.trim()}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Send Invite
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

