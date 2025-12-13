import { useState, useEffect, useRef } from "react";
import {
    Sparkles,
    ChevronRight,
    Maximize2,
    Mic,
    Volume2,
    VolumeX,
    Zap,
    Bot,
    ArrowUpRight,
    Loader2,
    X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { socketClient } from "@/lib/socket";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";

interface AiDockProps {
    className?: string;
    collapsed?: boolean;
}

const AVATAR_URL = "/ai-avatar.png";

export const AiDock = ({ className, collapsed }: AiDockProps) => {
    const navigate = useNavigate();
    const { currentWorkspace } = useApp();
    const [query, setQuery] = useState("");
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamContent, setStreamContent] = useState("");
    const [showPreview, setShowPreview] = useState(true);

    // Mock streaming effect for internal dock state
    useEffect(() => {
        if (!isStreaming) return;

        // Simulate incoming tokens if standard socket not hooked up yet
        const words = "I'm analyzing the latest project updates. It seems we're on track for the Q4 release, but the authentication module needs review.".split(" ");
        let i = 0;
        setStreamContent("");

        const interval = setInterval(() => {
            if (i >= words.length) {
                clearInterval(interval);
                setIsStreaming(false);
                return;
            }
            setStreamContent(prev => prev + (i === 0 ? "" : " ") + words[i]);
            i++;
        }, 150);

        return () => clearInterval(interval);
    }, [isStreaming]);

    // Handle actual socket events
    useEffect(() => {
        const handleToken = (data: { token: string }) => {
            setIsStreaming(true);
            setShowPreview(true);
            setStreamContent(prev => prev + data.token);
        };

        socketClient.on('ai:stream:token', handleToken);

        return () => {
            socketClient.off('ai:stream:token', handleToken);
        };
    }, []);

    const handleAsk = () => {
        if (!query.trim()) return;

        // Switch to streaming state
        setIsStreaming(true);
        setStreamContent("");

        // Emit event if backend is ready
        if (socketClient.isConnected() && currentWorkspace) {
            socketClient.emit('ai:ask', {
                workspaceId: currentWorkspace._id,
                query
            });
        }

        setQuery("");
    };

    const handleOpenFull = () => {
        if (currentWorkspace) {
            navigate(`/app/ai/${currentWorkspace._id}`);
        } else {
            navigate('/app/chatbot');
        }
    };

    if (collapsed) {
        return (
            <div className={cn("px-2 py-4 flex flex-col items-center gap-3 border-t border-white/5", className)}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={() => setIsExpanded(true)}
                            className="relative w-10 h-10 rounded-full glass-premium flex items-center justify-center group hover:bg-primary/10 transition-all duration-300"
                        >
                            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 group-hover:opacity-100 opacity-50 transition-opacity" />
                            <img src={AVATAR_URL} className="w-6 h-6 object-cover rounded-full z-10" alt="AI" />
                            {isStreaming && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 flex">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                                </span>
                            )}
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Ask Orbix</TooltipContent>
                </Tooltip>
            </div>
        );
    }

    return (
        <div className={cn(
            "relative flex flex-col border-t border-white/10 bg-gradient-to-b from-white/5 to-transparent backdrop-blur-md transition-all duration-500 overflow-hidden group/dock",
            isExpanded ? "h-[320px]" : "h-[140px]",
            className
        )}>
            {/* Glassy Glow Top */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-50" />

            {/* Header */}
            <div className="px-4 pt-4 pb-2 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <div className="relative w-6 h-6">
                        <img src={AVATAR_URL} className="w-full h-full rounded-full object-cover shadow-sm ring-1 ring-white/20" alt="Orbix" />
                        {isStreaming && <div className="absolute inset-0 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.6)] animate-pulse" />}
                    </div>
                    <span className="text-xs font-semibold tracking-wide bg-gradient-to-r from-indigo-200 to-white bg-clip-text text-transparent">
                        Orbix
                    </span>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover/dock:opacity-100 transition-opacity duration-300">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full hover:bg-white/10 text-muted-foreground hover:text-white"
                        onClick={() => setIsMuted(!isMuted)}
                    >
                        {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full hover:bg-white/10 text-muted-foreground hover:text-white"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? <X className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                    </Button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 px-4 relative flex flex-col min-h-0">
                {isStreaming || streamContent ? (
                    <div className="flex-1 overflow-hidden relative group/text">
                        <p className="text-[13px] leading-relaxed text-indigo-100/90 font-light subpixel-antialiased line-clamp-4">
                            {streamContent}
                            {isStreaming && <span className="inline-block w-1.5 h-3 ml-0.5 align-middle bg-indigo-400 animate-pulse" />}
                        </p>

                        {/* Expand overlay */}
                        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#13141c] to-transparent flex items-end justify-center pb-1 opacity-0 group-hover/text:opacity-100 transition-opacity">
                            <button
                                onClick={handleOpenFull}
                                className="text-[10px] bg-primary/20 hover:bg-primary/30 text-primary-foreground px-3 py-1 rounded-full backdrop-blur-md border border-primary/20 flex items-center gap-1 transition-all hover:scale-105"
                            >
                                <Maximize2 className="w-3 h-3" />
                                Open Full View
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col justify-center items-center text-center opacity-60">
                        <Sparkles className="w-8 h-8 text-indigo-500/30 mb-2" />
                        <p className="text-[11px] text-muted-foreground">Ready to assist.</p>
                    </div>
                )}
            </div>

            {/* Input Area (Visible when expanded or space allows) */}
            <div className={cn(
                "p-3 mt-auto bg-black/20 backdrop-blur-xl border-t border-white/5 transition-all duration-300",
                !isExpanded && "border-transparent bg-transparent"
            )}>
                <div className="relative group/input">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-xl opacity-0 group-hover/input:opacity-100 transition-opacity blur-sm" />
                    <div className="relative flex items-center bg-white/5 border border-white/10 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                            placeholder="Ask Orbix..."
                            className="h-9 border-0 bg-transparent text-xs placeholder:text-muted-foreground/50 focus-visible:ring-0 px-3"
                        />
                        <button
                            onClick={handleAsk}
                            disabled={!query.trim()}
                            className="p-2 text-indigo-400 hover:text-indigo-300 disabled:opacity-30 disabled:hover:text-indigo-400 transition-colors"
                        >
                            {isStreaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                </div>

                {isExpanded && (
                    <div className="mt-2 flex items-center justify-between px-1">
                        <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[9px] h-4 px-1 border-white/10 text-muted-foreground bg-white/5 hover:bg-white/10 cursor-pointer">
                                This Context
                            </Badge>
                        </div>
                        <button onClick={handleOpenFull} className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                            Full Page <ChevronRight className="w-2.5 h-2.5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
