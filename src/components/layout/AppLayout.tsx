import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LayoutGrid,
  MessageSquare,
  CheckSquare,
  Users,
  Video,
  Brain,
  TrendingUp,
  Settings,
  Search,
  Bell,
  ChevronDown,
  Plus,
  Check,
  LogOut,
  Sparkles,
  Menu
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function AppLayout() {
  const { currentWorkspace, workspaces, setCurrentWorkspace, user, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Navigation Items
  const navigationGroups = [
    {
      title: "Workspace",
      items: [
        { name: "Home", href: "/app", icon: LayoutGrid },
        { name: "Chat", href: "/app/chat", icon: MessageSquare },
        { name: "Tasks", href: "/app/tasks", icon: CheckSquare },
        { name: "Team", href: "/app/team", icon: Users },
        { name: "Meetings", href: "/app/meetings", icon: Video },
      ]
    },
    {
      title: "Tools",
      items: [
        { name: "Orbix Chatbot", href: "/app/chatbot", icon: Brain },
        { name: "Updates", href: "/app/updates", icon: TrendingUp },
      ]
    }
  ];

  return (
    <div className="flex w-full h-screen bg-[#F8FAFF] overflow-hidden selection:bg-primary/20">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[100px]" />
      </div>

      {/* Sidebar - World Class Design */}
      <aside className={cn(
        "flex flex-col w-[280px] shrink-0 m-4 mr-0 rounded-[32px] bg-gradient-to-b from-white/80 via-white/60 to-white/40 backdrop-blur-3xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] relative z-30 transition-all duration-300 md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0 absolute inset-y-0 left-0 m-0 rounded-none w-3/4" : "hidden md:flex"
      )}>

        {/* Workspace Brand / Switcher */}
        <div className="p-6 pb-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/40 transition-all duration-300 border border-transparent hover:border-white/40 group bg-white/20">
                {currentWorkspace ? (
                  <>
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#A78BFA] flex items-center justify-center text-white font-bold text-lg shadow-[0_4px_14px_rgba(108,99,255,0.3)] group-hover:shadow-[0_6px_20px_rgba(108,99,255,0.4)] transition-all transform group-hover:scale-105 shrink-0">
                      {currentWorkspace.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 text-left min-w-0 flex flex-col justify-center">
                      <p className="font-bold text-[15px] truncate text-foreground/90 tracking-tight leading-none mb-1">{currentWorkspace.name}</p>
                      <div className="flex items-center gap-1.5 opacity-60">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <p className="text-[11px] font-medium capitalize tracking-wide">{currentWorkspace.role}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 text-left">
                    <p className="font-bold text-sm text-foreground/70">Select Workspace</p>
                  </div>
                )}
                <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center text-foreground/50 group-hover:bg-white/60 transition-colors">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-68 glass-premium rounded-[24px] border-white/60 p-2 shadow-xl" align="start" sideOffset={8}>
              <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-[2px] font-bold px-4 py-3">Switch Workspace</DropdownMenuLabel>
              <div className="max-h-[240px] overflow-y-auto pr-1">
                {workspaces.map((ws) => (
                  <DropdownMenuItem
                    key={ws._id}
                    className={cn(
                      "flex items-center gap-3 py-3 px-3 rounded-xl cursor-pointer mb-1 transition-all duration-200",
                      currentWorkspace?._id === ws._id ? "bg-primary/10" : "hover:bg-white/40"
                    )}
                    onClick={() => setCurrentWorkspace(ws)}
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm transition-colors",
                      currentWorkspace?._id === ws._id ? "bg-primary text-white shadow-md" : "bg-muted text-muted-foreground"
                    )}>
                      {ws.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className={cn("font-bold text-sm", currentWorkspace?._id === ws._id && "text-primary")}>{ws.name}</p>
                    </div>
                    {currentWorkspace?._id === ws._id && <Check className="w-4 h-4 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </div>
              <DropdownMenuSeparator className="bg-border/50" />
              <Link to="/join-workspace">
                <DropdownMenuItem className="py-2.5 px-3 rounded-xl cursor-pointer focus:bg-white/60 mt-1">
                  <Plus className="w-4 h-4 mr-2 text-primary" />
                  <span className="text-primary font-medium">Join / Create Workspace</span>
                </DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-2 space-y-8 overflow-y-auto no-scrollbar scroll-smooth">
          {navigationGroups.map((group) => (
            <div key={group.title} className="relative">
              <h4 className="px-5 mb-3 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[2px]">
                {group.title}
              </h4>
              <div className="space-y-1.5">
                {group.items.map((item) => {
                  /* Logic ensuring /app/chat isn't highlighted when /app/chatbot is active */
                  const isActive = item.href === "/app"
                    ? location.pathname === "/app"
                    : location.pathname.startsWith(item.href) &&
                    (item.href !== "/app/chat" || location.pathname === "/app/chat");

                  const isChatbot = item.name === "Orbix Chatbot";

                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        "group flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-[14px] font-medium transition-all duration-300 ease-out relative",
                        isActive
                          ? "bg-white text-primary shadow-[0_4px_20px_-8px_rgba(108,99,255,0.3)] scale-[1.02]"
                          : "text-muted-foreground/80 hover:text-foreground hover:bg-white/50 hover:shadow-sm",
                        isChatbot && !isActive && "text-indigo-500/80 hover:text-indigo-600 hover:bg-indigo-50/50"
                      )}
                    >
                      <div className={cn(
                        "relative flex items-center justify-center transition-all duration-300",
                        isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600",
                        isChatbot && !isActive && "text-indigo-500"
                      )}>
                        <item.icon className={cn("w-[22px] h-[22px]", isActive && "fill-primary/10")} strokeWidth={1.8} />
                        {/* Active styling dot */}
                        {isActive && <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-primary" />}
                      </div>

                      <span className="flex-1 tracking-tight">{item.name}</span>

                      {isChatbot && (
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 mt-auto space-y-3">
          {/* AI Promo Card - Mini */}
          <div
            onClick={() => navigate('/app/chatbot')}
            className="relative overflow-hidden rounded-[24px] p-4 cursor-pointer group transition-all duration-500 hover:shadow-[0_8px_30px_-10px_rgba(108,99,255,0.4)] border border-white/40 bg-gradient-to-br from-[#6C63FF] to-[#8B5CF6]"
          >
            <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity"><Sparkles className="w-12 h-12 text-white" /></div>

            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner border border-white/10 group-hover:rotate-12 transition-transform duration-500">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div className="text-white">
                <p className="font-bold text-sm leading-tight">Orbix AI</p>
                <p className="text-[10px] text-white/80 font-medium">Auto-pilot active</p>
              </div>
            </div>
          </div>

          {/* Settings Link */}
          <Link to="/app/settings">
            <Button variant="ghost" className="w-full justify-start h-12 px-4 rounded-2xl hover:bg-white/60 text-muted-foreground/80 hover:text-foreground border border-transparent hover:border-white/40 transition-all font-medium">
              <Settings className="w-5 h-5 mr-3 text-slate-400 group-hover:text-slate-600" />
              Settings
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 relative flex flex-col h-full overflow-hidden">

        {/* Top Header - Glass */}
        <header className="h-20 shrink-0 px-8 flex items-center justify-between z-20">
          {/* Mobile Toggle */}
          <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <Menu className="w-6 h-6" />
          </Button>

          <div className="flex-1 max-w-xl relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" />
            <Input
              placeholder="Search anything..."
              className="w-full pl-12 h-12 rounded-[20px] border-white/40 bg-white/40 backdrop-blur-xl focus:bg-white/60 focus:ring-0 focus:border-white/60 shadow-lg shadow-indigo-100/20 transition-all text-base"
            />
          </div>

          <div className="flex items-center gap-4 ml-4">
            <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 hover:bg-white/40 text-muted-foreground relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="rounded-full h-12 pl-2 pr-4 bg-white/40 hover:bg-white/60 border border-white/40 gap-3 transition-all">
                  <Avatar className="h-9 w-9 border border-white/50">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-500 text-white font-bold">{user?.name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden sm:block">
                    <p className="text-sm font-bold leading-none">{user?.name || "User"}</p>
                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{currentWorkspace?.name}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 glass-premium rounded-2xl">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/app/profile')}>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-500 focus:text-red-600" onClick={logout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content Outlet */}
        <div className="flex-1 overflow-auto rounded-tl-[32px] border-l border-t border-white/30 bg-white/30 backdrop-blur-sm relative shadow-inner">
          <Outlet />
        </div>

      </main>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}
    </div>
  );
}
