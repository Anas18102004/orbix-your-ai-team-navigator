import { MessageSquare, LayoutGrid, Clock, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import { ChatSession } from "@/hooks/useAiChat";
import { cn } from "@/lib/utils";

interface AiContextSidebarProps {
    sessions: ChatSession[];
    currentSessionId: string | null;
    onNewChat: () => void;
    onLoadSession: (id: string) => void;
    onDeleteSession: (id: string) => void;
}

export const AiContextSidebar = ({ sessions, currentSessionId, onNewChat, onLoadSession, onDeleteSession }: AiContextSidebarProps) => {
    const { currentWorkspace } = useApp();

    return (
        <div className="flex flex-col w-[320px] h-full border-r border-white/5 bg-transparent p-4 space-y-6 overflow-hidden">
            {/* New Chat Button */}
            <Button
                onClick={onNewChat}
                className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-indigo-500/20 text-white font-semibold transition-all hover:scale-[1.02]"
            >
                <Plus className="w-5 h-5 mr-2" />
                New Chat
            </Button>

            {/* Active Context */}
            <div className="space-y-2">
                <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Context</h2>
                <Card className="bg-white/10 backdrop-blur-md border-white/10 p-3 flex items-center gap-3 hover:bg-white/20 transition-all cursor-pointer group shadow-sm rounded-xl">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border border-white/10 shadow-sm shrink-0">
                        <LayoutGrid className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-foreground truncate">{currentWorkspace?.name || "Global Context"}</h3>
                        <p className="text-[10px] text-muted-foreground/80 font-medium">Active Workspace</p>
                    </div>
                </Card>
            </div>

            {/* Recent Sessions */}
            <div className="flex-1 flex flex-col min-h-0">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-1">Recent History</h3>
                <div className="flex-1 overflow-y-auto pr-1 space-y-1 scrollbar-hide">
                    {sessions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground/50 text-xs">
                            No recent chats
                        </div>
                    ) : (
                        sessions.map((session) => (
                            <button
                                key={session.id}
                                onClick={() => onLoadSession(session.id)}
                                className={cn(
                                    "flex items-center gap-3 w-full p-3 rounded-xl text-left transition-all group border border-transparent",
                                    currentSessionId === session.id
                                        ? "bg-white/20 shadow-sm border-white/10"
                                        : "hover:bg-white/10 hover:border-white/5"
                                )}
                            >
                                <MessageSquare className={cn(
                                    "w-4 h-4 transition-colors",
                                    currentSessionId === session.id ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                )} />
                                <div className="flex-1 min-w-0">
                                    <p className={cn(
                                        "text-sm font-medium truncate",
                                        currentSessionId === session.id ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                                    )}>
                                        {session.title}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground/60 truncate">
                                        {new Date(session.date).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteSession(session.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-all"
                                    title="Delete chat"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
