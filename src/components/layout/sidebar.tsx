"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "./sidebar-nav";
import { BrandLockup } from "@/components/brand-logo";
import { COMPANY_NAME } from "@/lib/branding";
import { useEffect, useState } from "react";
import type { UserRole } from "@prisma/client";

interface SidebarProps {
  userRole: UserRole;
  userName: string;
  companyName?: string;
}

export function Sidebar({ userRole, userName, companyName = COMPANY_NAME }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const tabletQuery = window.matchMedia("(min-width: 768px) and (max-width: 1023px)");
    const desktopQuery = window.matchMedia("(min-width: 1024px)");

    function syncCollapsed() {
      if (tabletQuery.matches) {
        setCollapsed(true);
      } else if (desktopQuery.matches) {
        setCollapsed(false);
      }
    }

    syncCollapsed();
    tabletQuery.addEventListener("change", syncCollapsed);
    desktopQuery.addEventListener("change", syncCollapsed);
    return () => {
      tabletQuery.removeEventListener("change", syncCollapsed);
      desktopQuery.removeEventListener("change", syncCollapsed);
    };
  }, []);

  return (
    <aside
      data-tour="sidebar"
      className={cn(
        "hidden h-dvh shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex",
        collapsed ? "w-[4.25rem]" : "w-[16.5rem]"
      )}
    >
      <div
        className={cn(
          "flex border-b",
          collapsed
            ? "flex-col items-center gap-1 px-2 py-2"
            : "h-16 items-center justify-between px-3 lg:px-4"
        )}
      >
        {!collapsed && <BrandLockup companyName={companyName} />}
        {collapsed && <BrandLockup collapsed companyName={companyName} />}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="shrink-0"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <SidebarNav
        userRole={userRole}
        userName={userName}
        collapsed={collapsed}
        className="min-h-0 flex-1"
      />
    </aside>
  );
}
