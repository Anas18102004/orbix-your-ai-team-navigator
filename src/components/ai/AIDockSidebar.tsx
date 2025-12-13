import { useState, useRef, useEffect } from "react";
import {
    Sparkles,
    ChevronRight,
    ChevronLeft,
    Zap,
    X,
    Maximize2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { socketClient } from "@/lib/socket";

export const AIDockSidebar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [query, setQuery] = useState("");
    const { currentWorkspace } = useApp();
    const navigate = useNavigate();
    const [leftOffset, setLeftOffset] = useState(256); // Default 64 * 4 or 16rem

    // Calculate layout position
    useEffect(() => {
        const updatePosition = () => {
            const sidebar = document.querySelector('aside'); // Expecting the main sidebar
            if (sidebar) {
                const rect = sidebar.getBoundingClientRect();
                // We want to be slightly to the right of the sidebar
                setLeftOffset(rect.width + 16);
            }
        };

        // Initial and resize
        updatePosition();
        window.addEventListener('resize', updatePosition);

        // Polling in case sidebar expands/collapses
        const interval = setInterval(updatePosition, 500);

        return () => {
            window.removeEventListener('resize', updatePosition);
            clearInterval(interval);
        };
    }, []);

    // Listen for stream to auto-open or show badge
    useEffect(() => {
        const handleStreamStart = () => {
            if (!isOpen) setIsHovered(true); // Peek effect
            // Optionally auto-open: setIsOpen(true);
        };
        socketClient.on('ai:stream:start', handleStreamStart);
        return () => socketClient.off('ai:stream:start', handleStreamStart);
    }, [isOpen]);

    // Focus input on open
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (isOpen) {
            // Small delay for animation
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Global Esc to close
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen]);

    const handleQuickAsk = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && query.trim()) {
            // Navigate to full brain with query
            navigate(`/app/chatbot?q=${encodeURIComponent(query)}`);
            setQuery("");
            setIsOpen(false);
        }
    };

    return (
        <>
            {/* TRIGGER / COLLAPSED STATE */}
            <div
                style={{ left: `${leftOffset}px` }}
                className={cn(
                    "fixed bottom-6 z-50 flex flex-col items-start gap-4 transition-all duration-300 pointer-events-none",
                    isOpen ? "translate-y-10 opacity-0" : "translate-y-0 opacity-100"
                )}
            >
                {/* Main Toggle Orb */}
                <button
                    onClick={() => setIsOpen(true)}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className="pointer-events-auto group relative w-14 h-14 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:border-indigo-500/50"
                >
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 animate-pulse-slow" />
                    <Sparkles className="w-6 h-6 text-indigo-400 group-hover:text-white transition-colors" />

                    {/* Hover Label */}
                    <div className={cn(
                        "absolute left-full ml-4 px-3 py-1.5 rounded-lg bg-black/80 text-white text-xs font-medium whitespace-nowrap transition-all duration-200",
                        isHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                    )}>
                        Ask Orbix
                    </div>
                </button>
            </div>

            {/* EXPANDED PANEL */}
            <div
                style={{ left: `${leftOffset}px` }}
                className={cn(
                    "fixed bottom-6 z-50 w-[320px] rounded-2xl glass-premium border-white/10 shadow-2xl flex flex-col transition-all duration-500 cubic-bezier(0.22, 1, 0.36, 1)",
                    isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none"
                )}
            >
                {/* Handle to close */}
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs font-semibold text-foreground/80">Orbix Online</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-white/10" onClick={() => navigate('/app/chatbot')}>
                            <Maximize2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-white/10" onClick={() => setIsOpen(false)}>
                            <X className="w-4 h-4 text-muted-foreground" />
                        </Button>
                    </div>
                </div>

                {/* Content Placeholder */}
                <div className="flex-1 p-6 flex flex-col items-center justify-center text-center opacity-70">
                    <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
                        <Sparkles className="w-8 h-8 text-indigo-400" />
                    </div>
                    <p className="text-sm font-medium">How can I help you today?</p>
                    <p className="text-xs text-muted-foreground mt-2 max-w-[200px]">
                        I can analyze tasks, summarize meetings, or write code.
                    </p>
                </div>

                {/* Quick Input */}
                <div className="p-4 mt-auto">
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-xl blur opacity-75" />
                        <div className="relative bg-black/40 backdrop-blur-md rounded-xl overflow-hidden border border-white/10 flex items-center">
                            <Input
                                ref={inputRef}
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={handleQuickAsk}
                                placeholder="Quick ask..."
                                className="border-0 bg-transparent h-10 text-sm focus-visible:ring-0"
                            />
                            <div className="pr-3">
                                <Zap className="w-4 h-4 text-amber-400" />
                            </div>
                        </div>
                    </div>
                    <div className="mt-2 flex justify-between px-1">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Context: {currentWorkspace?.name || 'Global'}
                        </span>
                    </div>
                </div>
            </div>
        </>
    );
};
