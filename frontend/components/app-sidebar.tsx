"use client";

import { useEffect, useState } from "react"
import { v4 as uuidv4 } from "uuid"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { PlusIcon, Trash2Icon, InfoIcon } from "lucide-react"
import { useChatSession } from "@/context/chat-session-context"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { BrainIcon } from "lucide-react"
import getConfig from '@/lib/config'

export function AppSidebar() {
    const { sessionId, setSessionId, chatSessions, fetchChatSessions } = useChatSession();
    const [isAboutOpen, setIsAboutOpen] = useState(false);

    useEffect(() => {
        fetchChatSessions();
    }, [fetchChatSessions]);

    const handleNewChat = () => {
        const newSessionId = uuidv4();
        setSessionId(newSessionId); // Generate a new session ID
        // Optionally, you could also save this new session to the backend
        fetchChatSessions(); // Refresh the list of sessions
    };

    const handleSelectSession = (id: string) => {
        setSessionId(id);
    };

    const handleDeleteSession = async (id: string) => {
        try {
            const { apiUrl } = getConfig();
            const response = await fetch(`${apiUrl}/chat_sessions/${id}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                fetchChatSessions(); // Refresh the list of sessions
                if (sessionId === id) {
                    // If current session deleted, start a new one
                    const newSessionId = uuidv4();
                    setSessionId(newSessionId);
                }
            } else {
                console.error("Failed to delete chat session");
            }
        } catch (error) {
            console.error("Error deleting chat session:", error);
        }
    };

    return (
        <>
            <Sidebar>
                <SidebarHeader className="border-b border-gray-200 dark:border-gray-700">
                    <Button 
                        variant="ghost" 
                        className="w-full justify-start font-semibold text-base py-5 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400" 
                        onClick={handleNewChat}
                    >
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-1.5 rounded-md mr-2">
                            <PlusIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        New Chat
                    </Button>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarGroup>
                        <h3 className="mb-2 px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Recent Chats
                        </h3>
                        {chatSessions.length === 0 ? (
                            <div className="px-3 py-4 text-center">
                                <div className="bg-gray-100 dark:bg-gray-800 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                    </svg>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">No chat history yet</p>
                            </div>
                        ) : (
                            <ul className="space-y-1 px-2">
                                {[...chatSessions]
                                    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                                    .map((session, index) => (
                                        <li 
                                            key={session.id} 
                                            className="flex items-center group rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 animate-fade-in-up"
                                            style={{ animationDelay: `${index * 50}ms` }}
                                        >
                                            <Button
                                                variant="ghost"
                                                className={`flex-grow justify-start py-2 px-3 h-auto font-normal ${
                                                    sessionId === session.id 
                                                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' 
                                                        : 'text-gray-700 dark:text-gray-300 hover:bg-transparent'
                                                }`}
                                                onClick={() => handleSelectSession(session.id)}
                                            >
                                                <div className="flex items-center">
                                                    <div className="bg-gray-200 dark:bg-gray-700 w-6 h-6 rounded flex items-center justify-center mr-2 flex-shrink-0">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                    </div>
                                                    <span className="truncate text-sm">
                                                        {session.id.substring(0, 8)}...
                                                    </span>
                                                </div>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="opacity-0 group-hover:opacity-100 h-8 w-8 mr-1 text-gray-500 hover:text-red-500"
                                                onClick={() => handleDeleteSession(session.id)}
                                            >
                                                <Trash2Icon className="h-4 w-4" />
                                            </Button>
                                        </li>
                                    ))}
                            </ul>
                        )}
                    </SidebarGroup>
                </SidebarContent>
                <SidebarFooter className="border-t border-gray-200 dark:border-gray-700 p-0">
                    <Button 
                        variant="ghost" 
                        className="w-full justify-start py-4 px-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-none"
                        onClick={() => setIsAboutOpen(true)}
                    >
                        <InfoIcon className="mr-2 h-4 w-4" />
                        About DocuMind
                    </Button>
                </SidebarFooter>
            </Sidebar>

            <Dialog open={isAboutOpen} onOpenChange={setIsAboutOpen}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="text-center">
                        <div className="mx-auto bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-xl w-16 h-16 flex items-center justify-center mb-4">
                            <BrainIcon className="h-8 w-8 text-white" />
                        </div>
                        <DialogTitle className="text-2xl">DocuMind</DialogTitle>
                        <DialogDescription className="text-base">
                            Intelligent Document Q&A
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <h4 className="font-semibold flex items-center text-base">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                How to use
                            </h4>
                            <ul className="space-y-1.5">
                                <li className="flex items-start">
                                    <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full p-1 mt-0.5 mr-2 flex-shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-sm text-gray-600 dark:text-gray-300">Upload documents using the upload button</span>
                                </li>
                                <li className="flex items-start">
                                    <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full p-1 mt-0.5 mr-2 flex-shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-sm text-gray-600 dark:text-gray-300">Ask questions about your documents in the chat</span>
                                </li>
                                <li className="flex items-start">
                                    <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full p-1 mt-0.5 mr-2 flex-shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-sm text-gray-600 dark:text-gray-300">Create new chats for different topics</span>
                                </li>
                                <li className="flex items-start">
                                    <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full p-1 mt-0.5 mr-2 flex-shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-sm text-gray-600 dark:text-gray-300">Switch between past chats using the sidebar</span>
                                </li>
                            </ul>
                        </div>
                        <div className="grid gap-2">
                            <h4 className="font-semibold flex items-center text-base">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                </svg>
                                Features
                            </h4>
                            <ul className="space-y-1.5">
                                <li className="flex items-start">
                                    <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full p-1 mt-0.5 mr-2 flex-shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-sm text-gray-600 dark:text-gray-300">Retrieval-Augmented Generation (RAG)</span>
                                </li>
                                <li className="flex items-start">
                                    <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full p-1 mt-0.5 mr-2 flex-shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-sm text-gray-600 dark:text-gray-300">Multiple document formats</span>
                                </li>
                                <li className="flex items-start">
                                    <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full p-1 mt-0.5 mr-2 flex-shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-sm text-gray-600 dark:text-gray-300">Chat history persistence</span>
                                </li>
                                <li className="flex items-start">
                                    <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full p-1 mt-0.5 mr-2 flex-shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-sm text-gray-600 dark:text-gray-300">Dark/light theme support</span>
                                </li>
                                <li className="flex items-start">
                                    <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full p-1 mt-0.5 mr-2 flex-shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-sm text-gray-600 dark:text-gray-300">Source citations with similarity scores</span>
                                </li>
                            </ul>
                        </div>
                        <div className="grid gap-2">
                            <h4 className="font-semibold flex items-center text-base">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                </svg>
                                Built with
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded p-1.5">
                                    <div className="bg-white dark:bg-gray-700 p-1 rounded mr-1.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-black dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                        </svg>
                                    </div>
                                    <span className="text-xs font-medium">Next.js 15</span>
                                </div>
                                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded p-1.5">
                                    <div className="bg-white dark:bg-gray-700 p-1 rounded mr-1.5">
                                        <div className="bg-green-500 w-3 h-3 rounded-full flex items-center justify-center">
                                            <span className="text-white text-[5px] font-bold">F</span>
                                        </div>
                                    </div>
                                    <span className="text-xs font-medium">FastAPI</span>
                                </div>
                                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded p-1.5">
                                    <div className="bg-white dark:bg-gray-700 p-1 rounded mr-1.5">
                                        <div className="bg-red-500 w-3 h-3 rounded flex items-center justify-center">
                                            <span className="text-white text-[4px] font-bold">LC</span>
                                        </div>
                                    </div>
                                    <span className="text-xs font-medium">LangChain</span>
                                </div>
                                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded p-1.5">
                                    <div className="bg-white dark:bg-gray-700 p-1 rounded mr-1.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                        </svg>
                                    </div>
                                    <span className="text-xs font-medium">Tailwind CSS</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700 text-center">
                            <p className="mb-1">Built for Guvi HCL Hackathon</p>
                            <p>Developed by Arun Avasthi, Akash Harshvardhan and Ankit Gupta.</p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}