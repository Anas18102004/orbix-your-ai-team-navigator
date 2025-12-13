import { useState } from "react";
import { useAiChat } from "@/hooks/useAiChat";
import { AiContextSidebar } from "@/components/ai/AiContextSidebar";
import { ChatCanvas } from "@/components/ai/ChatCanvas";
import { AiInputBar } from "@/components/ai/AiInputBar";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const AIBrain = () => {
    const { currentWorkspace } = useApp();
    const { messages, isStreaming, sendMessage, sessions, createNewChat, loadSession, currentSessionId, deleteSession } = useAiChat(currentWorkspace?._id);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    return (
        <div className="flex h-full bg-transparent overflow-hidden text-foreground selection:bg-primary/20 relative">
            {/* Background Ambience */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[150px] animate-pulse-soft" />
            </div>

            <div className="relative z-10 flex w-full max-w-[1920px] mx-auto shadow-2xl overflow-hidden h-full">
                {/* LEFT PANEL - Collapsible */}
                <div className={cn(
                    "relative transition-all duration-300 ease-in-out border-r border-white/10 bg-white/30 backdrop-blur-xl h-full flex flex-col",
                    isSidebarOpen ? "w-[320px] opacity-100 translate-x-0" : "w-0 opacity-0 -translate-x-full overflow-hidden border-none"
                )}>
                    {/* Sidebar Content Wrapper to prevent layout shift during collapse */}
                    <div className="w-[320px]">
                        <AiContextSidebar
                            sessions={sessions}
                            currentSessionId={currentSessionId}
                            onNewChat={createNewChat}
                            onLoadSession={loadSession}
                            onDeleteSession={deleteSession}
                        />
                    </div>
                </div>

                {/* SIDEBAR TOGGLE BUTTON - Floating */}
                <div className="absolute top-4 left-4 z-50">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className={cn(
                            "h-8 w-8 rounded-full bg-white/40 hover:bg-white/60 backdrop-blur-md shadow-sm border border-white/20 text-muted-foreground transition-all duration-300",
                            isSidebarOpen ? "left-[300px]" : "left-0"
                        )}
                        title={isSidebarOpen ? "Close Sidebar" : "Open Context"}
                    >
                        {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                    </Button>
                </div>

                {/* CENTER CANVAS - Centered & Expanded */}
                <div className="flex-1 flex flex-col relative min-w-0 bg-transparent">
                    <ChatCanvas messages={messages} isStreaming={isStreaming} />
                    <AiInputBar onSend={sendMessage} isStreaming={isStreaming} />
                </div>
            </div>
        </div>
    );
};

export default AIBrain;
