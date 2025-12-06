import { Outlet, Link, useLocation } from "react-router-dom";
import { 
  Home, 
  MessageSquare, 
  CheckSquare, 
  Brain, 
  Users, 
  Settings, 
  Bell,
  Search,
  Plus,
  Sparkles,
  ChevronDown,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navigation = [
  { name: "Home", href: "/app", icon: Home },
  { name: "Chat", href: "/app/chat", icon: MessageSquare, badge: 3 },
  { name: "Tasks", href: "/app/tasks", icon: CheckSquare, badge: 5 },
  { name: "AI Brain", href: "/app/ai", icon: Brain },
  { name: "Team", href: "/app/team", icon: Users },
];

const workspaces = [
  { id: 1, name: "Backend IT Team", role: "omni" },
  { id: 2, name: "Frontend Platform", role: "crew" },
  { id: 3, name: "Client ABC Support", role: "guest" },
];

const AppLayout = () => {
  const location = useLocation();
  const currentWorkspace = workspaces[0];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* Workspace Switcher */}
        <div className="p-4 border-b border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent transition-colors">
                <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                  {currentWorkspace.name.charAt(0)}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-sm truncate">{currentWorkspace.name}</p>
                  <div className="flex items-center gap-1">
                    <Badge variant={currentWorkspace.role as "omni" | "crew" | "guest"} className="text-[10px] px-1.5 py-0">
                      {currentWorkspace.role}
                    </Badge>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {workspaces.map((ws) => (
                <DropdownMenuItem key={ws.id} className="flex items-center gap-3 py-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                    {ws.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{ws.name}</p>
                    <Badge variant={ws.role as "omni" | "crew" | "guest"} className="text-[10px] px-1.5 py-0">
                      {ws.role}
                    </Badge>
                  </div>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Plus className="w-4 h-4 mr-2" />
                Create Workspace
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== "/app" && location.pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-soft" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="flex-1">{item.name}</span>
                {item.badge && (
                  <span className={cn(
                    "min-w-[20px] h-5 flex items-center justify-center text-xs rounded-full",
                    isActive ? "bg-sidebar-primary-foreground/20" : "bg-primary/10 text-primary"
                  )}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* AI Assistant */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg gradient-ai flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-accent-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">Ask Orbix</p>
                <p className="text-xs text-muted-foreground">AI-powered help</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
              <MessageSquare className="w-4 h-4 mr-2" />
              What should I work on?
            </Button>
          </div>
        </div>

        {/* Settings */}
        <div className="p-4 border-t border-sidebar-border">
          <Link to="/app/settings">
            <Button variant="ghost" className="w-full justify-start">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-card/50">
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search tasks, chats, members..." 
                className="pl-9 bg-secondary/50 border-0"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
                2
              </span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium hover:bg-primary/20 transition-colors">
                  JD
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>John Doe</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
