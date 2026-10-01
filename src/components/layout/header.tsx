"use client";

import { Bell } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { TourHelpButton } from "@/components/onboarding/tour-help-button";
import { BrandLogo } from "@/components/brand-logo";
import { COMPANY_NAME } from "@/lib/branding";
import Link from "next/link";
import type { UserRole } from "@prisma/client";
import { getRouteTitle } from "@/lib/navigation/route-titles";

interface HeaderProps {
  userName: string;
  userRole: UserRole;
  notificationCount?: number;
  title?: string;
  companyName?: string;
}

const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin / Manager",
  EMPLOYEE: "Employee",
  DRIVER: "Driver",
};

export function Header({
  title,
  userName,
  userRole,
  notificationCount = 0,
  companyName = COMPANY_NAME,
}: HeaderProps) {
  const pathname = usePathname();
  const pageTitle = title ?? getRouteTitle(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur-sm sm:h-16 sm:px-5 lg:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <BrandLogo size={28} className="rounded-md md:hidden" alt={companyName} />
        <h2 className="truncate text-base font-semibold tracking-tight sm:text-lg">{pageTitle}</h2>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <TourHelpButton />
        <ThemeToggle />
        <Link href="/notifications" data-tour="notifications">
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </Button>
        </Link>
        <div className="hidden border-l pl-3 text-right sm:block">
          <p className="max-w-[140px] truncate text-sm font-medium lg:max-w-none">{userName}</p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{roleLabels[userRole]}</p>
        </div>
      </div>
    </header>
  );
}
