import { useState, useEffect } from "react";
import { AiDock } from "@/components/chat/AiDock";
import {
    Search,
    Hash,
    MessageSquare,
    Video,
    Users,
    Plus,
    Zap,
    Settings,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    LogOut,
    Bell,
    Command,
    LayoutGrid,
    Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PremiumSidebarProps {
    isOpen: boolean;
    onToggle: () => void;
    className?: string;
}

const PremiumSidebar = ({ isOpen, onToggle, className }: PremiumSidebarProps) => {
    const { currentWorkspace, user } = useApp();
    const navigate = useNavigate();
    const [activeItem, setActiveItem] = useState("general");

    // Mock data for display
    const channels = [
        { id: "general", name: "general", unread: 0, hasAi: true },
        { id: "dev", name: "backend-dev", unread: 3, hasAi: false },
        { id: "design", name: "design-system", unread: 0, hasAi: true },
        { id: "random", name: "random", unread: 0, hasAi: false },
    ];

    const directMessages = [
        { id: "1", name: "Sarah Connor", status: "online", avatar: "/avatars/sarah.jpg" },
        { id: "2", name: "John Wick", status: "busy", avatar: "/avatars/john.jpg" },
        { id: "3", name: "Neo Anderson", status: "offline", avatar: "/avatars/neo.jpg" },
    ];

    const meetings = [
        { id: "m1", title: "Daily Standup", time: "10:00 AM", status: "upcoming" }
    ];

    return (
        <aside
            className={cn(
                "relative h-screen flex flex-col transition-all duration-300 ease-spring",
                isOpen ? "w-[280px]" : "w-[72px]",
                "border-r border-white/10",
                // Glassmorphism base
                "bg-white/5 backdrop-blur-2xl",
                "shadow-[4px_0_24px_-2px_rgba(0,0,0,0.1)]",
                className
            )}
        >
            {/* 1. Brand + Workspace Switcher */}
            <div className={cn(
                "flex items-center h-16 px-4 mb-2 transition-all duration-300",
                isOpen ? "justify-between" : "justify-center"
            )}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className={cn(
                            "flex items-center gap-3 rounded-xl p-2 transition-all hover:bg-white/10 group w-full",
                            isOpen ? "justify-start" : "justify-center"
                        )}>
                            <div className="relative shrink-0">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7A5AF8] to-[#3E7BFA] flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
                                    <SparklesIcon className="w-4 h-4 text-white animate-pulse-slow" />
                                </div>
                            </div>

                            {isOpen && (
                                <div className="text-left flex-1 min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
                                    <h2 className="font-semibold text-sm text-foreground/90 truncate">
                                        {currentWorkspace?.name || "Orbix"}
                                    </h2>
                                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5 ">
                                        {currentWorkspace?.role || "Crew"} <ChevronDown className="w-3 h-3 opacity-50" />
                                    </span>
                                </div>
                            )}
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 glass-premium">
                        <DropdownMenuLabel>Switch Workspace</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            <LayoutGrid className="mr-2 h-4 w-4" /> Orbit Inc.
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <Plus className="mr-2 h-4 w-4" /> Create Workspace
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* 2. Search Box */}
            <div className={cn(
                "px-4 mb-6 transition-all duration-300",
                !isOpen && "px-3"
            )}>
                <button
                    className={cn(
                        "flex items-center gap-2 w-full h-9 rounded-lg bg-white/5 border border-white/10 shadow-sm text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all group",
                        isOpen ? "px-3" : "justify-center px-0"
                    )}
                >
                    <Search className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                    {isOpen && (
                        <>
                            <span className="text-sm font-medium truncate flex-1 text-left">Search...</span>
                            <kbd className="hidden group-hover:inline-flex h-5 items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[10px] font-medium opacity-100">
                                <span className="text-xs">⌘</span>K
                            </kbd>
                        </>
                    )}
                </button>
            </div>

            {/* Scrollable Navigation Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 space-y-6 scrollbar-thin scrollbar-thumb-white/10">

                {/* A. Channels */}
                <div className="space-y-1">
                    {isOpen && (
                        <div className="px-2 pb-1 flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            <span>Channels</span>
                            <Plus className="w-3 h-3 cursor-pointer hover:text-foreground transition-colors" />
                        </div>
                    )}

                    {channels.map((channel) => (
                        <SidebarItem
                            key={channel.id}
                            isOpen={isOpen}
                            isActive={activeItem === channel.name}
                            onClick={() => setActiveItem(channel.name)}
                            icon={
                                channel.hasAi ? <SparklesIcon className="w-3.5 h-3.5 text-indigo-400" /> : <Hash className="w-4 h-4" />
                            }
                            label={channel.name}
                            badge={channel.unread}
                        />
                    ))}
                </div>

                {/* B. Direct Messages */}
                <div className="space-y-1">
                    {isOpen && <div className="px-2 pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Messages</div>}

                    {directMessages.map((dm) => (
                        <SidebarItem
                            key={dm.id}
                            isOpen={isOpen}
                            isActive={activeItem === dm.id}
                            onClick={() => setActiveItem(dm.id)}
                            icon={
                                <div className="relative">
                                    <Avatar className="w-5 h-5 border border-white/10">
                                        <AvatarImage src={dm.avatar} />
                                        <AvatarFallback className="text-[9px] bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-300">
                                            {dm.name[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className={cn(
                                        "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-[#1a1b26]",
                                        dm.status === 'online' ? "bg-green-500" : dm.status === 'busy' ? "bg-red-500" : "bg-gray-500"
                                    )} />
                                </div>
                            }
                            label={dm.name}
                        />
                    ))}
                </div>

                {/* C. Meetings */}
                <div className="space-y-1">
                    {isOpen && <div className="px-2 pb-1 flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        <span>Meetings</span>
                        <Video className="w-3 h-3 cursor-pointer hover:text-foreground transition-colors" />
                    </div>}

                    {meetings.map((meeting) => (
                        <div
                            key={meeting.id}
                            className={cn(
                                "group relative flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-all duration-200",
                                "hover:bg-white/5 border border-transparent hover:border-white/5",
                                isOpen ? "justify-start" : "justify-center"
                            )}
                        >
                            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0 text-red-400 group-hover:bg-red-500/20 animate-in zoom-in-50 duration-300">
                                <Calendar className="w-4 h-4" />
                            </div>

                            {isOpen && (
                                <div className="flex-1 min-w-0 text-left">
                                    <p className="text-xs font-medium text-foreground/90 truncate">{meeting.title}</p>
                                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                        {meeting.time}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

            </div>

            {/* 4. Quick Actions */}
            <div className={cn(
                "mt-auto pt-4 pb-2 px-3 border-t border-white/5 space-y-1",
                !isOpen && "items-center flex flex-col pt-2"
            )}>
                <SidebarItem
                    isOpen={isOpen}
                    icon={<Plus className="w-4 h-4" />}
                    label="New Chat"
                />
            </div>

            {/* AI Dock */}
            <div className="mx-2 mb-2 mt-1">
                <AiDock collapsed={!isOpen} />
            </div>

            {/* 5. User Footer */}
            <div className={cn(
                "p-3 mx-2 mb-3 mt-1 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all cursor-pointer group",
                isOpen ? "flex items-center gap-3" : "flex justify-center"
            )}>
                <Avatar className="w-8 h-8 rounded-lg border border-white/10 shadow-sm">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-medium text-xs">
                        {user?.name?.[0] || "U"}
                    </AvatarFallback>
                </Avatar>

                {isOpen && (
                    <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-medium text-foreground truncate">{user?.name || "User"}</p>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-green-500 ring-2 ring-[#13141c]" />
                            <p className="text-[10px] text-muted-foreground truncate">Available</p>
                        </div>
                    </div>
                )}

                {isOpen && (
                    <Settings className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100" />
                )}
            </div>

            {/* Sizer Handle (Desktop only) */}
            <button
                onClick={onToggle}
                className="absolute -right-3 top-8 w-6 h-6 rounded-full bg-card border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:scale-110 transition-all z-50 hidden md:flex"
            >
                {isOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>

        </aside>
    );
};

// Sub-component for individual items
const SidebarItem = ({
    isOpen,
    isActive,
    icon,
    label,
    badge,
    onClick,
    className
}: {
    isOpen: boolean;
    isActive?: boolean;
    icon: React.ReactNode;
    label: string;
    badge?: number | string;
    onClick?: () => void;
    className?: string;
}) => {
    return (
        <button
            onClick={onClick}
            className={cn(
                "relative flex items-center gap-3 w-full p-2 rounded-lg transition-all duration-200 group",
                isActive
                    ? "bg-gradient-to-r from-[#7A5AF8]/10 to-[#3E7BFA]/10 text-foreground"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                isOpen ? "justify-start" : "justify-center",
                className
            )}
        >
            {/* Active Indicator Bar */}
            {isActive && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-gradient-to-b from-[#7A5AF8] to-[#3E7BFA] shadow-[0_0_12px_rgba(122,90,248,0.5)]" />
            )}

            {/* Icon Wrapper */}
            <div className={cn(
                "shrink-0 transition-transform duration-200",
                isActive ? "text-[#7A5AF8] scale-105" : "group-hover:text-foreground group-hover:scale-105"
            )}>
                {icon}
            </div>

            {/* Label & Badge (Collapsed hidden) */}
            {isOpen && (
                <div className="flex-1 flex items-center justify-between min-w-0 animate-in fade-in slide-in-from-left-1 duration-200">
                    <span className={cn(
                        "text-sm font-medium truncate",
                        isActive && "font-semibold"
                    )}>
                        {label}
                    </span>
                    {badge && (
                        <Badge className="h-5 px-1.5 min-w-[1.25rem] bg-indigo-500/20 text-indigo-300 border-0 hover:bg-indigo-500/30">
                            {badge}
                        </Badge>
                    )}
                </div>
            )}

            {!isOpen && badge && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-[#13141c]" />
            )}
        </button>
    );
};

const SparklesIcon = ({ className }: { className?: string }) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        <path d="M5 3v4" />
        <path d="M9 5H5" />
        <path d="M19 18v3" />
        <path d="M16 21h3" />
    </svg>
);

export default PremiumSidebar;
