"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { PaperclipIcon, BrainIcon } from "lucide-react";
import { useChatSession } from "@/context/chat-session-context";
import getConfig from '@/lib/config';

export function Chat() {
    const { sessionId, setSessionId } = useChatSession();
    const [messages, setMessages] = useState<{ sender: 'user' | 'ai', text: string, sources?: any[] }[]>([]);
    const [input, setInput] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
    const [documentUrlInput, setDocumentUrlInput] = useState<string>("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [hasDocumentUploaded, setHasDocumentUploaded] = useState<boolean>(false);
    const [documents, setDocuments] = useState<any[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load messages when session changes
    useEffect(() => {
        const loadMessages = async () => {
            const { apiUrl } = getConfig();
            if (sessionId) {
                try {
                    const response = await fetch(`${apiUrl}/chat_sessions/${sessionId}/messages`);
                    if (response.ok) {
                        const data = await response.json();
                        // Convert the API response to our message format
                        const formattedMessages = data.map((msg: any) => ({
                            sender: msg.sender,
                            text: msg.text,
                            sources: msg.sender === 'ai' && msg.sources && Array.isArray(msg.sources) ? msg.sources : []
                        }));
                        setMessages(formattedMessages);
                    } else {
                        console.error("Failed to fetch messages for session:", sessionId);
                        setMessages([]);
                    }
                } catch (error) {
                    console.error("Error fetching messages:", error);
                    setMessages([]);
                }
            } else {
                setMessages([]);
            }
        };

        loadMessages();
    }, [sessionId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Fetch documents for the current session when sessionId changes
    useEffect(() => {
        const fetchDocuments = async () => {
            const { apiUrl } = getConfig();
            if (sessionId) {
                try {
                    const response = await fetch(`${apiUrl}/documents?session_id=${sessionId}`);
                    if (response.ok) {
                        const data = await response.json();
                        setDocuments(data);
                        // Check if any document is 'ready' to set hasDocumentUploaded
                        const anyReady = data.some((doc: any) => doc.status === "ready");
                        setHasDocumentUploaded(anyReady);
                    } else {
                        console.error("Failed to fetch documents for session:", sessionId);
                        setDocuments([]);
                    }
                } catch (error) {
                    console.error("Error fetching documents:", error);
                    setDocuments([]);
                }
            }
        };
        fetchDocuments();
    }, [sessionId]); // Dependency on sessionId

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = { sender: 'user' as const, text: input.trim() };
        setMessages((prevMessages) => [...prevMessages, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const { apiUrl } = getConfig();
            const response = await fetch(`${apiUrl}/query?session_id=${sessionId}&input_message=${encodeURIComponent(userMessage.text)}`);
            const data = await response.json();
            const aiMessage = { 
                sender: 'ai' as const, 
                text: data.response,
                sources: data.sources && Array.isArray(data.sources) ? data.sources : []
            };
            setMessages((prevMessages) => [...prevMessages, aiMessage]);
        } catch (error) {
            console.error("Error fetching response:", error);
            setMessages((prevMessages) => [...prevMessages, { sender: 'ai' as const, text: "Sorry, something went wrong.", sources: [] }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUploadDocument = async () => {
        if (!documentUrlInput.trim() && !selectedFile) return;

        setIsLoading(true);
        const { apiUrl } = getConfig();
        const formData = new FormData();
        formData.append("session_id", sessionId);

        if (documentUrlInput.trim()) {
            formData.append("url", documentUrlInput.trim());
        } else if (selectedFile) {
            formData.append("file", selectedFile);
        }

        try {
            const response = await fetch(`${apiUrl}/upload_document`, {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            if (response.ok) {
                // Add the new document to the list with 'pending' status
                setDocuments((prevDocs) => [
                    ...prevDocs,
                    {
                        id: data.document_id,
                        session_id: sessionId,
                        name: documentUrlInput || selectedFile?.name,
                        type: documentUrlInput ? "url" : "pdf",
                        status: "pending",
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    },
                ]);
                setDocumentUrlInput("");
                setSelectedFile(null);
                // Keep modal open to show document list and status
                // setIsUploadModalOpen(false); // Don't close modal immediately
                // setHasDocumentUploaded(true); // This will be set by polling
            } else {
                setMessages((prevMessages) => [...prevMessages, { sender: 'ai' as const, text: `Error uploading document: ${data.message}` }]);
            }
        } catch (error) {
            console.error("Error uploading document:", error);
            setMessages((prevMessages) => [...prevMessages, { sender: 'ai' as const, text: "Sorry, something went wrong during document upload." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteDocument = async (documentId: string) => {
        console.log("Attempting to delete document:", documentId, "for session:", sessionId); // Add this line
        setIsLoading(true);
        const { apiUrl } = getConfig();
        try {
            const response = await fetch(`${apiUrl}/documents/${documentId}?session_id=${sessionId}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                setDocuments((prevDocs) => prevDocs.filter((doc) => doc.id !== documentId));
                // Re-check if any document is 'ready' after deletion
                const anyReady = documents.filter((doc) => doc.id !== documentId).some((doc: any) => doc.status === "ready");
                setHasDocumentUploaded(anyReady);
            } else {
                const data = await response.json();
                console.error("Failed to delete document:", data.message);
                setMessages((prevMessages) => [...prevMessages, { sender: 'ai' as const, text: `Error deleting document: ${data.message}` }]);
            }
        } catch (error) {
            console.error("Error deleting document:", error);
            setMessages((prevMessages) => [...prevMessages, { sender: 'ai' as const, text: "Sorry, something went wrong during document deletion." }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Polling for document status
    useEffect(() => {
        const pollInterval = setInterval(async () => {
            if (sessionId && documents.some(doc => doc.status === "pending" || doc.status === "processing")) {
                try {
                    const { apiUrl } = getConfig();
                    const response = await fetch(`${apiUrl}/documents?session_id=${sessionId}`);
                    if (response.ok) {
                        const data = await response.json();
                        setDocuments(data);
                        const anyReady = data.some((doc: any) => doc.status === "ready");
                        setHasDocumentUploaded(anyReady);
                    } else {
                        console.error("Failed to fetch documents for session:", sessionId);
                    }
                } catch (error) {
                    console.error("Error polling document status:", error);
                }
            }
        }, 5000); // Poll every 5 seconds

        return () => clearInterval(pollInterval); // Cleanup on unmount
    }, [sessionId, documents]); // Dependencies

    // Helper function to determine if sources should be shown
    const shouldShowSources = (msg: { sender: 'user' | 'ai', text: string, sources?: any[] }) => {
        return msg.sender === 'ai' && msg.sources && Array.isArray(msg.sources) && msg.sources.length > 0;
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-grow overflow-hidden flex flex-col">
                <div className="flex-grow overflow-y-auto pb-4 p-4 space-y-6">
                    <div className="max-w-3xl mx-auto space-y-6 py-4">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center p-4 animate-fade-in">
                                <div className="mb-8 animate-fade-in-up animate-delay-100">
                                    <div className="relative">
                                        <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-6 rounded-2xl w-32 h-32 flex items-center justify-center mx-auto shadow-lg animate-fade-in-scale">
                                        <BrainIcon className="h-16 w-16 text-white" />
                                        </div>
                                        <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                                            NEW
                                        </div>
                                    </div>
                                </div>
                                <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 mb-4 tracking-tight animate-fade-in-up animate-delay-200">
                                    DocuMind
                                </h1>
                                <p className="text-xl text-gray-600 dark:text-gray-300 max-w-md mb-3 font-light animate-fade-in-up animate-delay-300">
                                    Intelligent Document Q&A
                                </p>
                                <p className="text-gray-500 dark:text-gray-400 mb-2 max-w-lg animate-fade-in-up animate-delay-400">
                                    Upload documents and ask questions to get AI-powered answers based on your content
                                </p>
                                <div className="inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs font-medium px-2.5 py-0.5 rounded-full mb-8 animate-fade-in-up animate-delay-400">
                                    Built for Guvi HCL Hackathon
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-2xl w-full mb-10 animate-fade-in-up animate-delay-500">
                                    <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md hover:-translate-y-1">
                                        <div className="bg-blue-100 dark:bg-blue-900/50 w-12 h-12 rounded-lg flex items-center justify-center mb-3 mx-auto">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                        </div>
                                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">1. Upload</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Add your PDFs or URLs</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md hover:-translate-y-1">
                                        <div className="bg-purple-100 dark:bg-purple-900/50 w-12 h-12 rounded-lg flex items-center justify-center mb-3 mx-auto">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                            </svg>
                                        </div>
                                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">2. Ask</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Pose questions about your content</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md hover:-translate-y-1">
                                        <div className="bg-green-100 dark:bg-green-900/50 w-12 h-12 rounded-lg flex items-center justify-center mb-3 mx-auto">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                            </svg>
                                        </div>
                                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">3. Discover</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Get intelligent answers</p>
                                    </div>
                                </div>
                                <Button 
                                    onClick={() => setIsUploadModalOpen(true)}
                                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-2 px-6 rounded-full shadow-lg hover:shadow-xl transition-all animate-fade-in-up animate-delay-600 hover:scale-105"
                                >
                                    <PaperclipIcon className="mr-2 h-5 w-5" />
                                    Upload Document
                                </Button>
                            </div>
                        )}
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up w-full`}
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="flex flex-col w-full max-w-3xl mx-auto">
                                    <div
                                        className={`rounded-2xl px-4 py-3 ${
                                            msg.sender === 'user'
                                                ? 'bg-blue-500 text-white rounded-br-none'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-none'
                                        }`}
                                    >
                                        <div className={`prose prose-sm dark:prose-invert max-w-none leading-normal`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                    {msg.sender === 'ai' && msg.sources && Array.isArray(msg.sources) && msg.sources.length > 0 && (
                                        <div className="mt-3">
                                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center group relative">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                                                </svg>
                                                Sources (similarity scores):
                                                <div className="absolute left-0 top-full mt-1 w-64 p-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                                                    <div className="font-medium mb-1">Similarity Scores</div>
                                                    <div className="text-gray-300">Higher percentages indicate more relevant document chunks to your query.</div>
                                                </div>
                                            </div>
                                            <div className="flex overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                                <div className="flex gap-3 min-w-max">
                                                    {msg.sources.map((source, sourceIndex) => (
                                                        <div 
                                                            key={sourceIndex}
                                                            className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 text-xs min-w-[280px] max-w-[280px] shadow-sm hover:shadow-md transition-shadow flex-shrink-0"
                                                        >
                                                            <div className="flex items-center space-x-2 mb-2">
                                                                <div className="bg-blue-100 dark:bg-blue-900/50 p-1 rounded">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                    </svg>
                                                                </div>
                                                                <span className="font-medium truncate">
                                                                    Doc: {source.document_id}
                                                                </span>
                                                            </div>
                                                            <div className="text-gray-500 dark:text-gray-300 space-y-1">
                                                                <div className="flex justify-between text-xs">
                                                                    <span>Chunk: {source.chunk_index}</span>
                                                                    <span className="font-medium text-blue-600 dark:text-blue-400" title="Similarity score - higher means more relevant">
                                                                        {(source.score * 100).toFixed(1)}%
                                                                    </span>
                                                                </div>
                                                                <div className="mt-1 text-gray-600 dark:text-gray-400 line-clamp-2 text-xs">
                                                                    {source.content_excerpt}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl rounded-bl-none px-4 py-3">
                                    <div className="flex space-x-2">
                                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>
            </div>
            <div className="sticky bottom-0 w-full p-4 bg-background">
                <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex space-x-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsUploadModalOpen(true)}
                        disabled={isLoading}
                        className="h-12 w-12"
                    >
                        <PaperclipIcon className="h-5 w-5" />
                        <span className="sr-only">Upload Document</span>
                    </Button>
                    <div className="flex-grow relative">
                        <Input
                            placeholder="Type a message..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isLoading}
                            className="h-12 pl-4 pr-12 floating-input"
                        />
                        <Button 
                            type="submit" 
                            disabled={isLoading}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full"
                        >
                            <span className="sr-only">Send</span>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-4 w-4"
                            >
                                <path d="m22 2-7 20-4-9-9-4Z" />
                                <path d="M22 2 11 13" />
                            </svg>
                        </Button>
                    </div>
                </form>
            </div>

            <Sheet open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
                <SheetContent side="right" className="px-4 w-full sm:max-w-lg flex flex-col">
                    <SheetHeader>
                        <SheetTitle>Upload Document</SheetTitle>
                        <SheetDescription>
                            Add documents to chat with their content
                        </SheetDescription>
                    </SheetHeader>
                    <div className="flex flex-col space-y-6 py-6 flex-shrink-0">
                        {/* URL Upload Section */}
                        <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                                <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                </div>
                                <h3 className="font-medium">From URL</h3>
                            </div>
                            <Input
                                id="document-url"
                                placeholder="https://example.com/document.pdf"
                                value={documentUrlInput}
                                onChange={(e) => {
                                    setDocumentUrlInput(e.target.value);
                                    setSelectedFile(null); // Clear file selection if URL is typed
                                }}
                                disabled={isLoading || selectedFile !== null} // Disable if file is selected
                                className="w-full"
                            />
                        </div>

                        {/* Divider */}
                        <div className="relative flex items-center justify-center w-full">
                            <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                            <span className="flex-shrink mx-4 text-sm text-gray-500 dark:text-gray-400">OR</span>
                            <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                        </div>

                        {/* File Upload Section */}
                        <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                                <div className="bg-green-100 dark:bg-green-900 p-2 rounded-full">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                </div>
                                <h3 className="font-medium">Upload File</h3>
                            </div>
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
                                <Input
                                    id="document-file"
                                    type="file"
                                    accept="application/pdf"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setSelectedFile(e.target.files[0]);
                                            setDocumentUrlInput(""); // Clear URL if file is selected
                                        }
                                    }}
                                    disabled={isLoading || documentUrlInput.trim() !== ""} // Disable if URL is typed
                                    className="hidden"
                                />
                                <label 
                                    htmlFor="document-file" 
                                    className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                                >
                                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-full">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                    </div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {selectedFile ? selectedFile.name : "Click to upload a PDF"}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {selectedFile ? "Click to change file" : "PDF files only (max 10MB)"}
                                    </p>
                                </label>
                            </div>
                        </div>

                        {/* Upload Button */}
                        <Button 
                            onClick={handleUploadDocument} 
                            disabled={isLoading || (!documentUrlInput.trim() && !selectedFile)} 
                            className="w-full"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </>
                            ) : (
                                "Upload Document"
                            )}
                        </Button>
                    </div>

                    {/* Uploaded Documents Section */}
                    <div className="flex flex-col flex-grow min-h-0">
                        <div className="flex items-center justify-between mb-4 flex-shrink-0">
                            <h3 className="text-lg font-medium">Your Documents</h3>
                            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                {documents.length} {documents.length === 1 ? 'document' : 'documents'}
                            </span>
                        </div>
                        
                        {documents.length === 0 ? (
                            <div className="text-center py-8 flex-grow flex items-center justify-center">
                                <div>
                                    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">No documents uploaded yet</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-grow overflow-hidden flex flex-col">
                                <div className="space-y-3 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800 flex-grow">
                                    {documents.map((doc, index) => (
                                        <div 
                                            key={doc.id} 
                                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 animate-fade-in-up"
                                            style={{ animationDelay: `${index * 50}ms` }}
                                        >
                                            <div className="flex items-start space-x-3 min-w-0">
                                                <div className={`flex-shrink-0 mt-1 ${
                                                    doc.type === "url" ? "text-blue-500" : "text-green-500"
                                                }`}>
                                                    {doc.type === "url" ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                        </svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                        {doc.name.split('/').pop() || doc.name}
                                                    </p>
                                                    <div className="flex items-center space-x-2 mt-1">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                                            {doc.type.toUpperCase()}
                                                        </span>
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                            doc.status === "ready" ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200" :
                                                            doc.status === "pending" || doc.status === "processing" ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200" :
                                                            "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                                                        }`}>
                                                            {doc.status === "ready" ? "Ready" : 
                                                             doc.status === "pending" ? "Pending" : 
                                                             doc.status === "processing" ? "Processing" : "Failed"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteDocument(doc.id)}
                                                disabled={isLoading || doc.status === "pending" || doc.status === "processing"}
                                                className="h-8 w-8 text-gray-500 hover:text-red-500"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
