import { useState, useCallback, useEffect, useRef } from 'react';
import { socketClient } from '@/lib/socket';
import { useApp } from '@/contexts/AppContext';

export interface Message {
    _id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    blocks?: any[];
    isStreaming?: boolean;
}

export interface ChatSession {
    id: string;
    title: string;
    date: Date;
    messages: Message[];
}

export const useAiChat = (workspaceId?: string) => {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const streamingMsgIdRef = useRef<string | null>(null);

    // Load sessions from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('orbix_chat_sessions');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setSessions(parsed);
                // Load most recent if available
                if (parsed.length > 0) {
                    setCurrentSessionId(parsed[0].id);
                    setMessages(parsed[0].messages);
                }
            } catch (e) {
                console.error("Failed to parse chat sessions", e);
            }
        } else {
            createNewChat();
        }
    }, []);

    // Save sessions whenever they change
    useEffect(() => {
        if (sessions.length > 0) {
            localStorage.setItem('orbix_chat_sessions', JSON.stringify(sessions));
        }
    }, [sessions]);

    const createNewChat = useCallback(() => {
        const newId = Date.now().toString();
        const initialMessages: Message[] = [{
            _id: 'welcome',
            role: 'assistant',
            content: "Hello! I'm Orbix, your AI teammate. I'm ready to help you navigate your workspace.",
            timestamp: new Date(),
            isStreaming: false
        }];

        const newSession: ChatSession = {
            id: newId,
            title: 'New Conversation',
            date: new Date(),
            messages: initialMessages
        };

        setSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newId);
        setMessages(initialMessages);
        setIsStreaming(false);
    }, []);

    const loadSession = useCallback((sessionId: string) => {
        const session = sessions.find(s => s.id === sessionId);
        if (session) {
            setCurrentSessionId(sessionId);
            setMessages(session.messages);
            setIsStreaming(false);
        }
    }, [sessions]);

    // Update current session in the list whenever messages change
    useEffect(() => {
        if (!currentSessionId) return;

        setSessions(prev => prev.map(s => {
            if (s.id === currentSessionId) {
                // Update title based on first user message if it's "New Conversation"
                let title = s.title;
                if (s.title === 'New Conversation') {
                    const firstUserMsg = messages.find(m => m.role === 'user');
                    if (firstUserMsg) {
                        title = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
                    }
                }
                return { ...s, messages, title };
            }
            return s;
        }));
    }, [messages, currentSessionId]);

    const sendMessage = useCallback((text: string) => {
        if (!text.trim()) return;

        const userMsg: Message = {
            _id: Date.now().toString(),
            role: 'user',
            content: text,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setIsStreaming(true);

        // Simulation
        setTimeout(() => {
            const aiMsgId = (Date.now() + 1).toString();
            setMessages(prev => [...prev, {
                _id: aiMsgId,
                role: 'assistant',
                content: '',
                timestamp: new Date(),
                isStreaming: true
            }]);

            // Simple generative response simulation
            const responses = [
                "I can certainly help with that. Based on your current workspace context, here is what I found...",
                "Interesting question. Analyzing the latest metrics from your deployment logs...",
                "I've updated the task priority based on your request. Is there anything else you need?",
                "That sounds like a good plan. I've noted this in the meeting minutes."
            ];
            const randomResponse = responses[Math.floor(Math.random() * responses.length)] + " " + text;

            let i = 0;
            const interval = setInterval(() => {
                if (i >= randomResponse.length) {
                    clearInterval(interval);
                    setIsStreaming(false);
                    setMessages(prev => prev.map(m => m._id === aiMsgId ? { ...m, isStreaming: false } : m));
                    return;
                }
                const token = randomResponse[i];
                setMessages(prev => prev.map(m =>
                    m._id === aiMsgId ? { ...m, content: m.content + token } : m
                ));
                i++;
            }, 20); // Fast typing
        }, 800);
    }, [workspaceId]);

    const deleteSession = useCallback((sessionId: string) => {
        setSessions(prev => {
            const newSessions = prev.filter(s => s.id !== sessionId);
            // If we deleted the current session, switch to another or create new
            if (currentSessionId === sessionId) {
                if (newSessions.length > 0) {
                    setCurrentSessionId(newSessions[0].id);
                    setMessages(newSessions[0].messages);
                } else {
                    // No sessions left, create new
                    setTimeout(() => createNewChat(), 0);
                }
            }
            return newSessions;
        });
    }, [currentSessionId, createNewChat]);

    return {
        messages,
        isStreaming,
        sendMessage,
        sessions,
        currentSessionId,
        createNewChat,
        loadSession,
        deleteSession
    };
};
