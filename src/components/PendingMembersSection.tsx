import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";

interface PendingMember {
  _id: string;
  name: string;
  email: string;
  role: "omni" | "crew";
  specialization: string | null;
  selfPreferredSpecialization: string | null;
  joinedAt: string;
}

interface PendingMembersSectionProps {
  workspaceId: string;
  isOrgAdmin?: boolean;
  onUpdate?: () => void;
}

const specializations = [
  { value: "backend", label: "Backend Developer" },
  { value: "frontend", label: "Frontend Developer" },
  { value: "qa", label: "QA Engineer" },
  { value: "devops", label: "DevOps Engineer" },
  { value: "pm", label: "Product Manager" },
  { value: "design", label: "Designer" },
];

export const PendingMembersSection = ({
  workspaceId,
  isOrgAdmin = false,
  onUpdate,
}: PendingMembersSectionProps) => {
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState<string | null>(null);
  const [memberSpecializations, setMemberSpecializations] = useState<Record<string, string>>({});
  const [memberRoles, setMemberRoles] = useState<Record<string, "omni" | "crew">>({});

  useEffect(() => {
    loadPendingMembers();
  }, [workspaceId]);

  const loadPendingMembers = async () => {
    try {
      setLoading(true);
      const result = await apiClient.getPendingMembers(workspaceId);
      setPendingMembers(result.members);
      // Initialize form state
      const specs: Record<string, string> = {};
      const roles: Record<string, "omni" | "crew"> = {};
      result.members.forEach((member) => {
        specs[member._id] = member.specialization || "";
        roles[member._id] = member.role;
      });
      setMemberSpecializations(specs);
      setMemberRoles(roles);
    } catch (error: any) {
      toast.error(error.message || "Failed to load pending members");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async (memberId: string) => {
    try {
      setFinalizing(memberId);
      const specialization = memberSpecializations[memberId] || null;
      const role = memberRoles[memberId];

      await apiClient.finalizeMemberRole(workspaceId, memberId, {
        specialization: specialization as any,
        role: isOrgAdmin ? role : undefined, // Only org admin can change role
      });

      toast.success("Role and specialization finalized");
      await loadPendingMembers();
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to finalize role");
    } finally {
      setFinalizing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (pendingMembers.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-yellow-600" />
          Members with Pending Role/Specialization
        </CardTitle>
        <CardDescription>
          {pendingMembers.length} member{pendingMembers.length !== 1 ? "s" : ""} need their role
          or specialization finalized
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pendingMembers.map((member) => (
            member && (
              <div
                key={member._id}
                className="p-4 border rounded-lg space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{member.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {member.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Joined {new Date(member.joinedAt).toLocaleDateString()}
                    </p>
                    {member.selfPreferredSpecialization && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground">
                          Self-preference:{" "}
                          <span className="font-medium">
                            {specializations.find((s) => s.value === member.selfPreferredSpecialization)
                              ?.label || member.selfPreferredSpecialization}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {isOrgAdmin && (
                    <div>
                      <Label htmlFor={`role-${member._id}`}>Role</Label>
                      <Select
                        value={memberRoles[member._id]}
                        onValueChange={(value) =>
                          setMemberRoles({ ...memberRoles, [member._id]: value as "omni" | "crew" })
                        }
                      >
                        <SelectTrigger id={`role-${member._id}`} className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="crew">Crew</SelectItem>
                          <SelectItem value="omni">Omni</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label htmlFor={`spec-${member._id}`}>Specialization</Label>
                    <Select
                      value={memberSpecializations[member._id] || ""}
                      onValueChange={(value) =>
                        setMemberSpecializations({
                          ...memberSpecializations,
                          [member._id]: value,
                        })
                      }
                    >
                      <SelectTrigger id={`spec-${member._id}`} className="mt-1">
                        <SelectValue placeholder="Select specialization" />
                      </SelectTrigger>
                      <SelectContent>
                        {specializations.map((spec) => (
                          <SelectItem key={spec.value} value={spec.value}>
                            {spec.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => handleFinalize(member._id)}
                    disabled={finalizing === member._id || !memberSpecializations[member._id]}
                  >
                    {finalizing === member._id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Finalizing...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Finalize
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

