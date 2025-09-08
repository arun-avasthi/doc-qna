import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider"
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ChatSessionProvider } from "@/context/chat-session-context"
import { ThemeToggle } from "@/components/theme-toggle"
import { BrainIcon } from "lucide-react"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DocuMind - Intelligent Document Q&A for Guvi HCL Hackathon",
  description: "An intelligent RAG-based chatbot for document question answering. Built for Guvi HCL Hackathon.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-screen`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ChatSessionProvider>
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset className="h-screen flex flex-col">
                <div className="flex items-center justify-between p-2 border-b">
                  <div className="flex items-center space-x-2">
                    <SidebarTrigger size="lg" />
                    <div className="flex items-center space-x-2">
                      <BrainIcon className="h-6 w-6 text-primary" />
                      <span className="text-lg font-semibold">DocuMind</span>
                    </div>
                  </div>
                  <div className="ml-auto flex items-center space-x-2">
                    <ThemeToggle />
                  </div>
                </div>
                <div className="flex-grow overflow-hidden">
                  {children}
                </div>
              </SidebarInset>
            </SidebarProvider>
          </ChatSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
