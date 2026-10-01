"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { signOut } from "next-auth/react";
import type { UserRole } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";
import { sidebarNavItems } from "@/lib/navigation/sidebar-items";

interface SidebarNavProps {
  userRole: UserRole;
  userName: string;
  collapsed?: boolean;
  onNavigate?: () => void;
  className?: string;
}

export function SidebarNav({
  userRole,
  userName,
  collapsed = false,
  onNavigate,
  className,
}: SidebarNavProps) {
  const pathname = usePathname();

  const filteredNav = sidebarNavItems.filter(
    (item) => !item.permission || hasPermission(userRole, item.permission)
  );

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <ScrollArea className="flex-1 py-3">
        <nav className="space-y-0.5 px-2">
          {filteredNav.map((item, index) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : item.href === "/rentals"
                  ? pathname === "/rentals" || pathname.startsWith("/rentals/")
                  : pathname.startsWith(item.href);
            const Icon = item.icon;
            const isFeatured = item.featured === true;
            const previousSection = filteredNav[index - 1]?.section;
            const showSection = Boolean(item.section && item.section !== previousSection);

            return (
              <div key={item.href}>
                {showSection && !collapsed && (
                  <p className="px-3 pb-1.5 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                    {item.section}
                  </p>
                )}
                {showSection && collapsed && index > 0 && <div className="mx-2 my-2 h-px bg-border" />}
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  data-tour-nav={item.tourNavId}
                  className={cn(
                    "group flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    collapsed && "justify-center px-2",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isFeatured
                        ? "border border-primary/20 bg-primary/5 font-semibold text-foreground hover:bg-primary/10"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0",
                      isFeatured && !isActive && "text-primary"
                    )}
                  />
                  {!collapsed && (
                    <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                      <span className="truncate">{item.title}</span>
                      {isFeatured && !isActive && (
                        <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          Main
                        </span>
                      )}
                    </span>
                  )}
                </Link>
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator />
      <div className="p-3">
        {!collapsed && (
          <p className="mb-2 truncate px-1 text-sm font-medium text-foreground">{userName}</p>
        )}
        <Button
          variant="outline"
          size={collapsed ? "icon" : "default"}
          className={cn(
            "w-full min-h-10 hover:bg-accent",
            collapsed && "px-0"
          )}
          onClick={() =>
            void signOut({ redirect: false }).then(() => {
              window.location.assign("/login");
            })
          }
          title={collapsed ? "Sign out" : undefined}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </div>
    </div>
  );
}
