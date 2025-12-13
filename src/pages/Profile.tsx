import { useState, useEffect } from "react";
import {
  User,
  Mail,
  Calendar,
  Camera,
  Edit3,
  Plus,
  X,
  Shield,
  Users,
  Bell,
  Lock,
  Sparkles,
  Award,
  TrendingUp,
  Heart,
  Zap,
  CheckCircle2,
  AlertCircle,
  Moon,
  Sun,
  Smile,
  Meh,
  Frown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";
import { format } from "date-fns";

const Profile = () => {
  const { user, workspaces } = useApp();
  const [mood, setMood] = useState<"happy" | "neutral" | "tired">("happy");
  const [availability, setAvailability] = useState<"available" | "busy" | "dnd">("available");
  const [skills, setSkills] = useState<string[]>(["React", "TypeScript", "Node.js", "MongoDB"]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddSkillOpen, setIsAddSkillOpen] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  
  // Privacy settings
  const [privacySettings, setPrivacySettings] = useState({
    aiAccessMessages: true,
    aiSuggestTasks: true,
    omniViewWorkload: true,
    hidePersonalAnalytics: false,
  });

  // Notification preferences
  const [notifications, setNotifications] = useState({
    taskUpdates: true,
    mentions: true,
    aiSuggestions: true,
    crisisAlerts: true,
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill("");
      setIsAddSkillOpen(false);
      toast.success("Skill added!");
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
    toast.success("Skill removed");
  };

  const moods = [
    { id: "happy", emoji: "😊", label: "Happy" },
    { id: "neutral", emoji: "🙂", label: "Neutral" },
    { id: "tired", emoji: "😴", label: "Tired" },
  ];

  const availabilityOptions = [
    { id: "available", label: "Available", icon: Sun, color: "text-success" },
    { id: "busy", label: "Busy", icon: AlertCircle, color: "text-warning" },
    { id: "dnd", label: "Do Not Disturb", icon: Moon, color: "text-destructive" },
  ];

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Header Section */}
        <div className="relative">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-border/50 shadow-soft p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              {/* Avatar with Glowing Ring */}
              <div className="relative group">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary via-accent to-primary opacity-20 blur-xl animate-pulse" />
                <div className="relative">
                  <Avatar className="w-32 h-32 border-4 border-white shadow-xl">
                    <AvatarImage src="" alt={user.name} />
                    <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary to-accent text-white">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <button className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform border-2 border-white">
                    <Camera className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1 text-center md:text-left space-y-4">
                <div>
                  <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                    {user.name}
                  </h1>
                  <p className="text-muted-foreground text-lg">{user.email}</p>
                </div>

                {/* Role Badges */}
                <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
                  {workspaces.map((ws) => (
                    <Badge
                      key={ws._id}
                      variant={ws.role === "omni" ? "omni" : ws.role === "crew" ? "default" : "secondary"}
                      className="px-4 py-1.5 text-sm font-medium shadow-sm"
                    >
                      {ws.role === "omni" && <Shield className="w-3.5 h-3.5 mr-1.5" />}
                      {ws.role === "crew" && <Users className="w-3.5 h-3.5 mr-1.5" />}
                      {ws.role.charAt(0).toUpperCase() + ws.role.slice(1)}
                    </Badge>
                  ))}
                </div>

                {/* Workspace Chips */}
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  {workspaces.map((ws) => (
                    <Badge
                      key={ws._id}
                      variant="outline"
                      className="px-3 py-1 bg-primary/5 border-primary/20 text-primary"
                    >
                      {ws.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Edit Button */}
              <Button
                variant="gradient"
                size="lg"
                className="shadow-lg hover:scale-105 transition-transform"
                onClick={() => setIsEditMode(!isEditMode)}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                {isEditMode ? "Save Changes" : "Edit Profile"}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* User Details Card */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-border/50 shadow-soft p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                User Details
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p className="font-medium">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Member Since</Label>
                    <p className="font-medium">{format(new Date(), "MMMM yyyy")}</p>
                  </div>
                </div>

                {/* Availability Status */}
                <div className="p-3 rounded-lg bg-muted/30">
                  <Label className="text-xs text-muted-foreground mb-3 block">Availability Status</Label>
                  <div className="flex gap-2">
                    {availabilityOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.id}
                          onClick={() => setAvailability(option.id as any)}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all",
                            availability === option.id
                              ? "border-primary bg-primary/10 shadow-sm"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <Icon className={cn("w-4 h-4", option.color)} />
                          <span className="text-sm font-medium">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Skills Section */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-border/50 shadow-soft p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <Badge
                    key={skill}
                    variant="secondary"
                    className="px-4 py-2 text-sm bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 hover:scale-105 transition-transform cursor-pointer group"
                    onClick={() => isEditMode && handleRemoveSkill(skill)}
                  >
                    {skill}
                    {isEditMode && (
                      <X className="w-3 h-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </Badge>
                ))}
                {isEditMode && (
                  <button
                    onClick={() => setIsAddSkillOpen(true)}
                    className="px-4 py-2 rounded-full border-2 border-dashed border-primary/30 text-primary hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Skill
                  </button>
                )}
              </div>
            </div>

            {/* Daily Mood Tracker */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-border/50 shadow-soft p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                Daily Mood
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Help AI adjust reminders based on your mood
              </p>
              <div className="flex gap-3">
                {moods.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMood(m.id as any)}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:scale-105",
                      mood === m.id
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <span className="text-4xl">{m.emoji}</span>
                    <span className="text-xs font-medium text-muted-foreground">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Privacy Settings */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-border/50 shadow-soft p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Privacy Settings
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex-1">
                    <Label className="text-sm font-medium">AI Access Messages</Label>
                    <p className="text-xs text-muted-foreground">Allow AI to access messages in AI-enabled channels</p>
                  </div>
                  <Switch
                    checked={privacySettings.aiAccessMessages}
                    onCheckedChange={(checked) =>
                      setPrivacySettings({ ...privacySettings, aiAccessMessages: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex-1">
                    <Label className="text-sm font-medium">AI Suggest Tasks</Label>
                    <p className="text-xs text-muted-foreground">Allow AI to suggest tasks automatically</p>
                  </div>
                  <Switch
                    checked={privacySettings.aiSuggestTasks}
                    onCheckedChange={(checked) =>
                      setPrivacySettings({ ...privacySettings, aiSuggestTasks: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex-1">
                    <Label className="text-sm font-medium">Omni View Workload</Label>
                    <p className="text-xs text-muted-foreground">Allow Omni to view workload insights</p>
                  </div>
                  <Switch
                    checked={privacySettings.omniViewWorkload}
                    onCheckedChange={(checked) =>
                      setPrivacySettings({ ...privacySettings, omniViewWorkload: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex-1">
                    <Label className="text-sm font-medium">Hide Personal Analytics</Label>
                    <p className="text-xs text-muted-foreground">Hide your personal analytics from others</p>
                  </div>
                  <Switch
                    checked={privacySettings.hidePersonalAnalytics}
                    onCheckedChange={(checked) =>
                      setPrivacySettings({ ...privacySettings, hidePersonalAnalytics: checked })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Notification Preferences */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-border/50 shadow-soft p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Notifications
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex-1">
                    <Label className="text-sm font-medium">Task Updates</Label>
                    <p className="text-xs text-muted-foreground">Get notified about task changes</p>
                  </div>
                  <Switch
                    checked={notifications.taskUpdates}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, taskUpdates: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex-1">
                    <Label className="text-sm font-medium">Mentions</Label>
                    <p className="text-xs text-muted-foreground">Get notified when mentioned</p>
                  </div>
                  <Switch
                    checked={notifications.mentions}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, mentions: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex-1">
                    <Label className="text-sm font-medium">AI Suggestions</Label>
                    <p className="text-xs text-muted-foreground">Receive AI-powered suggestions</p>
                  </div>
                  <Switch
                    checked={notifications.aiSuggestions}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, aiSuggestions: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex-1">
                    <Label className="text-sm font-medium">Crisis Alerts</Label>
                    <p className="text-xs text-muted-foreground">Urgent alerts and notifications</p>
                  </div>
                  <Switch
                    checked={notifications.crisisAlerts}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, crisisAlerts: checked })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Achievements / Recognition */}
            <div className="bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 backdrop-blur-xl rounded-2xl border border-primary/20 shadow-soft p-6 hover:shadow-elevated transition-shadow">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Achievements
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/50">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Productivity Master</p>
                    <p className="text-xs text-muted-foreground">Completed 50+ tasks this month</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/50">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <Heart className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Team Player</p>
                    <p className="text-xs text-muted-foreground">Received 12 kudos this week</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/50">
                  <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Impact Summary</p>
                    <p className="text-xs text-muted-foreground">Contributed to 5 major projects</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Skill Dialog */}
      <Dialog open={isAddSkillOpen} onOpenChange={setIsAddSkillOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Skill</DialogTitle>
            <DialogDescription>Add a skill to your profile</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="e.g., Python, Design, Marketing"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddSkill();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSkillOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSkill} disabled={!newSkill.trim()}>
              Add Skill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;






