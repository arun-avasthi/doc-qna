"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import getConfig from '@/lib/config';

interface ChatSessionContextType {
    sessionId: string;
    setSessionId: (id: string) => void;
    chatSessions: { id: string; created_at: string; updated_at: string }[];
    fetchChatSessions: () => Promise<void>;
}

const ChatSessionContext = createContext<ChatSessionContextType | undefined>(undefined);

export const ChatSessionProvider = ({ children }: { children: ReactNode }) => {
    const [sessionId, setSessionId] = useState<string>("");
    const [chatSessions, setChatSessions] = useState<any[]>([]);
    const { apiUrl } = getConfig();

    useEffect(() => {
        // Initialize a new session ID when the provider mounts
        setSessionId(uuidv4());
        fetchChatSessions();
    }, []);

    const fetchChatSessions = async () => {
        try {
            const response = await fetch(`${apiUrl}/chat_sessions`);
            if (response.ok) {
                const data = await response.json();
                setChatSessions(data);
            } else {
                console.error("Failed to fetch chat sessions");
            }
        } catch (error) {
            console.error("Error fetching chat sessions:", error);
        }
    };

    return (
        <ChatSessionContext.Provider value={{
            sessionId,
            setSessionId,
            chatSessions,
            fetchChatSessions,
        }}>
            {children}
        </ChatSessionContext.Provider>
    );
};

export const useChatSession = () => {
    const context = useContext(ChatSessionContext);
    if (context === undefined) {
        throw new Error("useChatSession must be used within a ChatSessionProvider");
    }
    return context;
};