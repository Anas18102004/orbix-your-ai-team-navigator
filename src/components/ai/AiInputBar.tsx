import { useRef, useState, useEffect } from "react";
import { Send, Paperclip, Image as ImageIcon, Mic, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AiInputBarProps {
    onSend: (text: string) => void;
    isStreaming?: boolean;
}

export const AiInputBar = ({ onSend, isStreaming }: AiInputBarProps) => {
    const [input, setInput] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-focus on mount & interactions
    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    // Global keyboard shortcuts
    useEffect(() => {
        const handleGlobalKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                textareaRef.current?.focus();
            }
        };
        document.addEventListener('keydown', handleGlobalKey);
        return () => document.removeEventListener('keydown', handleGlobalKey);
    }, []);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [input]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (input.trim()) {
                onSend(input);
                setInput("");
            }
        }
    };

    return (
        <div className="absolute bottom-6 left-0 right-0 z-30 px-6 sm:px-12 flex flex-col items-center justify-center pointer-events-none">
            <div className="w-full max-w-4xl pointer-events-auto relative group">
                {/* Main Bar - Clean Glass without excessive glow */}
                <div className="relative bg-white/40 backdrop-blur-xl border border-white/40 rounded-[32px] shadow-lg flex flex-col transition-all overflow-hidden">

                    {/* Input Area */}
                    <div className="relative">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder=""
                            rows={1}
                            className="w-full bg-transparent border-0 text-foreground placeholder-transparent px-8 py-5 focus:ring-0 focus:outline-none resize-none max-h-[200px] scrollbar-hide text-lg leading-relaxed font-medium z-10 relative selection:bg-primary/20"
                        />

                        {/* Animated Placeholder */}
                        {!input && (
                            <div className="absolute top-5 left-8 text-muted-foreground/60 text-lg pointer-events-none flex items-center gap-1">
                                <Sparkles className="w-4 h-4 animate-pulse opacity-50" />
                                <span className="animate-pulse">Ask anything...</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between px-4 pb-4 pt-0">
                        <div className="flex gap-2">
                            {/* Minimized Tools */}
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-white/40 text-muted-foreground transition-all hover:scale-105"><Paperclip className="w-5 h-5" /></Button>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-white/40 text-muted-foreground transition-all hover:scale-105"><ImageIcon className="w-5 h-5" /></Button>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-white/40 text-muted-foreground transition-all hover:scale-105"><Mic className="w-5 h-5" /></Button>
                        </div>

                        <Button
                            onClick={() => {
                                if (input.trim()) {
                                    onSend(input);
                                    setInput("");
                                }
                            }}
                            disabled={!input.trim() || isStreaming}
                            className={cn(
                                "h-10 rounded-full px-6 transition-all duration-300 font-semibold shadow-lg text-white",
                                input.trim()
                                    ? "bg-gradient-to-r from-primary to-accent hover:shadow-primary/50 w-auto hover:scale-105"
                                    : "bg-muted text-muted-foreground w-10 px-0 opacity-50"
                            )}
                        >
                            {input.trim() ? (
                                <span className="flex items-center gap-2">Send <Send className="w-4 h-4 ml-1" /></span>
                            ) : (
                                <Sparkles className="w-5 h-5" />
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="text-center mt-4">
                <p className="text-[11px] text-muted-foreground/60 font-medium tracking-wide">Orbix AI can make mistakes. Verify important info.</p>
            </div>
        </div>
    );
};
