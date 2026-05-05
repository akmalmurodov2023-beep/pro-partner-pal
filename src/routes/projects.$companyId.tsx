import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";

export const Route = createFileRoute("/projects/$companyId")({
  component: () => <AppLayout><Outlet /></AppLayout>,
});