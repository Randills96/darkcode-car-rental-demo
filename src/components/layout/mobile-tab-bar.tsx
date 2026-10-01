"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import type { UserRole } from "@prisma/client";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import { sidebarNavItems } from "@/lib/navigation/sidebar-items";
import { useMobileNav } from "./mobile-nav-context";
import { BrandLockup } from "@/components/brand-logo";
import { COMPANY_NAME } from "@/lib/branding";

const PRIMARY_TAB_HREFS = ["/", "/rentals", "/customers", "/vehicles"] as const;

interface MobileTabBarProps {
  userRole: UserRole;
}

function isTabActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileTabBar({ userRole }: MobileTabBarProps) {
  const pathname = usePathname();
  const { open, setOpen } = useMobileNav();

  const allowedItems = sidebarNavItems.filter(
    (item) => !item.permission || hasPermission(userRole, item.permission)
  );
  const primaryTabs = PRIMARY_TAB_HREFS.map((href) =>
    allowedItems.find((item) => item.href === href)
  ).filter((item): item is NonNullable<typeof item> => Boolean(item));

  const onPrimaryTab = primaryTabs.some((item) => isTabActive(pathname, item.href));
  const moreActive = open || !onPrimaryTab;

  return (
    <nav
      data-tour="mobile-menu"
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.25)] backdrop-blur md:hidden"
      aria-label="Mobile app navigation"
    >
      <div
        className="grid h-16"
        style={{ gridTemplateColumns: `repeat(${primaryTabs.length + 1}, minmax(0, 1fr))` }}
      >
        {primaryTabs.map((item) => {
          const Icon = item.icon;
          const active = !open && isTabActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              data-tour-nav={item.tourNavId}
              onClick={() => setOpen(false)}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "stroke-[2.4px]")} />
              <span className="max-w-full truncate">{item.title}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            "flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium",
            moreActive ? "text-primary" : "text-muted-foreground"
          )}
          aria-expanded={open}
          aria-label="More pages"
        >
          <Ellipsis className="h-5 w-5" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}

export function MobileMoreSheet({
  userRole,
  userName,
  companyName = COMPANY_NAME,
}: {
  userRole: UserRole;
  userName: string;
  companyName?: string;
}) {
  const pathname = usePathname();
  const { open, setOpen } = useMobileNav();

  const allowedItems = sidebarNavItems.filter(
    (item) => !item.permission || hasPermission(userRole, item.permission)
  );
  const moreItems = allowedItems.filter(
    (item) => !(PRIMARY_TAB_HREFS as readonly string[]).includes(item.href)
  );

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />
      <div
        className={cn(
          "fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 flex max-h-[75vh] flex-col rounded-t-2xl border bg-background shadow-2xl transition-transform duration-300 md:hidden",
          open ? "translate-y-0" : "translate-y-[120%]"
        )}
        aria-hidden={!open}
      >
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-muted-foreground/30" />
        <div className="px-4 pb-2 pt-3">
          <BrandLockup companyName={companyName} className="mb-3" />
          <p className="text-sm font-semibold">More</p>
          <p className="truncate text-xs text-muted-foreground">{userName}</p>
        </div>
        <div className="min-h-0 overflow-y-auto px-3 pb-3">
          <div className="grid grid-cols-4 gap-2">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const active = isTabActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-tour-nav={item.tourNavId}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl px-1 py-3 text-center text-[11px] font-medium",
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="leading-tight">{item.title}</span>
                </Link>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() =>
              void signOut({ redirect: false }).then(() => {
                window.location.assign("/login");
              })
            }
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-medium"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
