import { Link, useRouterState } from "@tanstack/react-router";
import { Users, Building2, FolderKanban, Wallet, BarChart3, LogOut, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import i18n from "@/lib/i18n";

export function AppSidebar() {
  const { t } = useTranslation();
  const { signOut, user } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });

  const items = [
    { to: "/workers", label: t("workers"), icon: Users },
    { to: "/clients", label: t("clients"), icon: Building2 },
    { to: "/projects", label: t("projects"), icon: FolderKanban },
    { to: "/payments", label: t("payments"), icon: Wallet },
    { to: "/reports", label: t("reports"), icon: BarChart3 },
  ];

  const toggleLang = () => {
    const next = i18n.language === "uz" ? "ru" : "uz";
    i18n.changeLanguage(next);
    localStorage.setItem("lang", next);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="font-bold text-sidebar-foreground">{t("app_name")}</div>
        {user?.email && <div className="text-xs text-sidebar-foreground/60 truncate">{user.email}</div>}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("dashboard")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((it) => (
                <SidebarMenuItem key={it.to}>
                  <SidebarMenuButton asChild isActive={path.startsWith(it.to)}>
                    <Link to={it.to}>
                      <it.icon className="h-4 w-4" />
                      <span>{it.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2 gap-2">
        <Button variant="ghost" size="sm" onClick={toggleLang} className="justify-start">
          <Languages className="h-4 w-4 mr-2" /> {i18n.language === "uz" ? "O'zbekcha" : "Русский"}
        </Button>
        <Button variant="ghost" size="sm" onClick={signOut} className="justify-start">
          <LogOut className="h-4 w-4 mr-2" /> {t("logout")}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}