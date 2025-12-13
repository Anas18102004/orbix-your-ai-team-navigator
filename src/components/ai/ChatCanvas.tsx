import { useRef, useEffect } from "react";
import { Message } from "@/hooks/useAiChat";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, User, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ChatCanvasProps {
    messages: Message[];
    isStreaming: boolean;
}

const AVATAR_URL = "/ai-avatar.png";

export const ChatCanvas = ({ messages, isStreaming }: ChatCanvasProps) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isStreaming]);

    return (
        <div className="flex-1 relative flex flex-col min-h-0 bg-transparent">
            {/* Scroll Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden p-6 pb-40 scroll-smooth custom-scrollbar">
                <div className="max-w-3xl mx-auto space-y-10">
                    {/* Empty State Hero */}
                    {messages.length <= 1 && (
                        <div className="flex flex-col items-center justify-center pt-32 pb-10 opacity-0 animate-fade-in fill-mode-forwards" style={{ animationDelay: '0.2s' }}>
                            {/* 3D Glass Sphere Avatar */}
                            <div className="relative w-32 h-32 mb-10 group cursor-pointer animate-float">
                                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary to-accent blur-[60px] opacity-40 group-hover:opacity-60 transition-opacity duration-700"></div>
                                <div className="absolute inset-4 rounded-full bg-gradient-to-b from-white/80 to-white/10 backdrop-blur-md shadow-[inset_0_4px_20px_rgba(255,255,255,0.5)] border border-white/50 z-10 flex items-center justify-center overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 transform rotate-45 translate-x-[-100%] group-hover:translate-x-[100%]"></div>
                                    <Sparkles className="w-12 h-12 text-primary/80 drop-shadow-[0_0_15px_rgba(108,99,255,0.5)] animate-pulse-soft" />
                                </div>
                                {/* Orbiting particles */}
                                <div className="absolute inset-0 animate-spin-slow opacity-60">
                                    <div className="absolute top-0 left-1/2 w-2 h-2 bg-indigo-400 rounded-full blur-[1px] shadow-[0_0_10px_#6C63FF]"></div>
                                </div>
                            </div>

                            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground via-primary to-foreground mb-4 text-center tracking-tight">
                                How can I help you today?
                            </h1>
                            <p className="text-muted-foreground text-center max-w-md text-base leading-relaxed">
                                I'm Orbix, your intelligent workspace navigator. Ask me about tasks, meetings, or your team's progress.
                            </p>
                        </div>
                    )}

                    {/* Messages */}
                    {messages.filter(m => m._id !== 'welcome').map((msg, i) => (
                        <div
                            key={msg._id}
                            className={cn(
                                "flex gap-5 animate-in slide-in-from-bottom-4 fade-in duration-700",
                                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                            )}
                        >
                            {/* Avatar */}
                            <div className="shrink-0 mt-2">
                                {msg.role === 'assistant' ? (
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 border border-white/50 flex items-center justify-center shadow-lg backdrop-blur-md">
                                        <Bot className="w-5 h-5 text-primary" />
                                    </div>
                                ) : (
                                    <div className="h-10 w-10 rounded-full bg-white border border-white/50 shadow-sm flex items-center justify-center">
                                        <User className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                )}
                            </div>

                            {/* Bubble */}
                            <div className={cn(
                                "flex flex-col max-w-[70%] group",
                                msg.role === 'user' ? "items-end" : "items-start"
                            )}>
                                <div className="flex items-center gap-2 mb-1.5 px-1 opacity-0 group-hover:opacity-60 transition-opacity">
                                    <span className="text-[11px] font-bold tracking-wide uppercase text-muted-foreground">{msg.role === 'user' ? 'You' : 'Orbix'}</span>
                                    <span className="text-[10px] text-muted-foreground/60">{formatDistanceToNow(msg.timestamp, { addSuffix: false })}</span>
                                </div>

                                <div className={cn(
                                    "px-6 py-4 shadow-sm leading-7 whitespace-pre-wrap text-[14.5px]",
                                    msg.role === 'user'
                                        ? "bg-white text-foreground rounded-[24px] rounded-tr-sm font-medium border border-white/60 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)]"
                                        : "glass-premium text-foreground/90 rounded-[24px] rounded-tl-sm w-full border-white/40"
                                )}>
                                    {msg.content}
                                    {msg.isStreaming && <span className="inline-block w-1.5 h-4 ml-1.5 bg-primary/60 rounded-full animate-pulse align-middle" />}
                                </div>
                            </div>
                        </div>
                    ))}

                    <div ref={bottomRef} className="h-4" />
                </div>
            </div>
        </div>
    );
};
