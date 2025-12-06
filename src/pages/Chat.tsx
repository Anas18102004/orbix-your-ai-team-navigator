import { useState } from "react";
import { 
  MessageSquare, 
  Search, 
  Users, 
  Hash, 
  Lock,
  Brain,
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Phone,
  Video,
  CheckSquare,
  Sparkles,
  Image,
  Mic
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const channels = [
  { id: 1, name: "general", type: "channel", aiActive: true, unread: 2 },
  { id: 2, name: "backend-squad", type: "channel", aiActive: true, unread: 0 },
  { id: 3, name: "release-war-room", type: "channel", aiActive: true, unread: 5 },
  { id: 4, name: "casual-vibes", type: "channel", aiActive: false, unread: 0 },
];

const directMessages = [
  { id: 5, name: "Sarah Chen", avatar: "SC", online: true, unread: 1 },
  { id: 6, name: "Mike Johnson", avatar: "MJ", online: true, unread: 0 },
  { id: 7, name: "Alex Kumar", avatar: "AK", online: false, unread: 0 },
];

const messages = [
  {
    id: 1,
    user: "Sarah Chen",
    avatar: "SC",
    content: "Hey team, the login API is failing again 😭",
    time: "10:32 AM",
    isOwn: false,
  },
  {
    id: 2,
    user: "Sarah Chen",
    avatar: "SC",
    content: "",
    time: "10:32 AM",
    isOwn: false,
    attachment: { type: "image", name: "error-screenshot.png" },
  },
  {
    id: 3,
    user: "Orbix AI",
    avatar: "🤖",
    content: "",
    time: "10:33 AM",
    isOwn: false,
    isAI: true,
    taskCard: {
      title: "Fix Login API failure",
      priority: "P0",
      assignee: "John Doe",
      status: "Created",
    },
  },
  {
    id: 4,
    user: "John Doe",
    avatar: "JD",
    content: "On it! Checking the logs now.",
    time: "10:35 AM",
    isOwn: true,
  },
  {
    id: 5,
    user: "Mike Johnson",
    avatar: "MJ",
    content: "I saw similar issues yesterday. Might be related to the auth token refresh.",
    time: "10:37 AM",
    isOwn: false,
  },
];

const Chat = () => {
  const [activeChannel, setActiveChannel] = useState(channels[0]);
  const [message, setMessage] = useState("");

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Chat Sidebar */}
      <div className="w-64 border-r border-border bg-card/50 flex flex-col">
        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search chats..." className="pl-9 bg-secondary/50 border-0" />
          </div>
        </div>

        {/* Channels */}
        <div className="flex-1 overflow-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Channels</span>
              <Button variant="ghost" size="icon-sm" className="h-6 w-6">
                <Hash className="w-3 h-3" />
              </Button>
            </div>
            <div className="space-y-1">
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => setActiveChannel(channel)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                    activeChannel.id === channel.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary text-foreground"
                  )}
                >
                  <Hash className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left truncate">{channel.name}</span>
                  {channel.aiActive && (
                    <Brain className={cn(
                      "w-3 h-3 shrink-0",
                      activeChannel.id === channel.id ? "text-primary-foreground/70" : "text-accent"
                    )} />
                  )}
                  {channel.unread > 0 && (
                    <span className={cn(
                      "min-w-[18px] h-[18px] rounded-full text-[10px] font-medium flex items-center justify-center",
                      activeChannel.id === channel.id 
                        ? "bg-primary-foreground/20" 
                        : "bg-primary text-primary-foreground"
                    )}>
                      {channel.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Direct Messages */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Direct Messages</span>
              <Button variant="ghost" size="icon-sm" className="h-6 w-6">
                <Users className="w-3 h-3" />
              </Button>
            </div>
            <div className="space-y-1">
              {directMessages.map((dm) => (
                <button
                  key={dm.id}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-secondary transition-colors"
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs">
                      {dm.avatar}
                    </div>
                    {dm.online && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-card" />
                    )}
                  </div>
                  <span className="flex-1 text-left truncate">{dm.name}</span>
                  {dm.unread > 0 && (
                    <span className="min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-medium flex items-center justify-center">
                      {dm.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-card/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Hash className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">{activeChannel.name}</h2>
                {activeChannel.aiActive && (
                  <Badge variant="ai" className="text-[10px] gap-1">
                    <Brain className="w-3 h-3" />
                    AI Active
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">12 members</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Phone className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Video className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3",
                msg.isOwn && "flex-row-reverse"
              )}
            >
              {!msg.isOwn && (
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-medium",
                  msg.isAI 
                    ? "gradient-ai text-accent-foreground" 
                    : "bg-primary/10 text-primary"
                )}>
                  {msg.avatar}
                </div>
              )}
              <div className={cn("max-w-[70%]", msg.isOwn && "items-end")}>
                {!msg.isOwn && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{msg.user}</span>
                    <span className="text-xs text-muted-foreground">{msg.time}</span>
                  </div>
                )}
                
                {msg.content && (
                  <div className={cn(
                    "rounded-2xl px-4 py-2.5",
                    msg.isOwn 
                      ? "bg-primary text-primary-foreground rounded-br-md" 
                      : msg.isAI
                        ? "bg-accent/10 border border-accent/20 rounded-bl-md"
                        : "bg-secondary rounded-bl-md"
                  )}>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                )}

                {msg.attachment && (
                  <div className="mt-2 rounded-xl bg-secondary border border-border overflow-hidden">
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      <Image className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium">{msg.attachment.name}</p>
                    </div>
                  </div>
                )}

                {msg.taskCard && (
                  <div className="mt-2 rounded-xl bg-card border border-border shadow-soft overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg gradient-ai flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-accent-foreground" />
                        </div>
                        <span className="text-xs text-muted-foreground">Task created by Orbix</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckSquare className="w-5 h-5 text-primary mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium mb-1">{msg.taskCard.title}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="p0">{msg.taskCard.priority}</Badge>
                            <span>→ {msg.taskCard.assignee}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="px-4 py-3 bg-secondary/50 border-t border-border flex items-center justify-between">
                      <Button variant="ghost" size="sm" className="text-xs">
                        View Task
                      </Button>
                      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                        Why this assignment?
                      </Button>
                    </div>
                  </div>
                )}

                {msg.isOwn && (
                  <p className="text-xs text-muted-foreground mt-1 text-right">{msg.time}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-border bg-card/50">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon">
              <Paperclip className="w-5 h-5" />
            </Button>
            <div className="flex-1 relative">
              <Input
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="pr-24"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Button variant="ghost" size="icon-sm">
                  <Smile className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon-sm">
                  <Mic className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
            <Button variant="gradient" size="icon">
              <Send className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">
              <Brain className="w-3 h-3 inline mr-1" />
              Orbix is listening. Mention <span className="text-accent font-medium">@Orbix</span> for help.
            </p>
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              <Lock className="w-3 h-3" />
              Make Private
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
