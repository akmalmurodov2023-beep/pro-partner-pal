import type { ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">…</div>;
  if (!user) return <Navigate to="/login" />;
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center gap-2 border-b border-border px-4 bg-card">
            <SidebarTrigger />
          </header>
          <main className="flex-1 p-6">{children}</main>
        </div>
        <Toaster />
      </div>
    </SidebarProvider>
  );
}