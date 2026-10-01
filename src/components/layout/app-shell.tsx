"use client";

import { useState } from "react";
import type { UserRole } from "@prisma/client";
import { Sidebar } from "./sidebar";
import { MobileMoreSheet, MobileTabBar } from "./mobile-tab-bar";
import { MobileNavProvider } from "./mobile-nav-context";
import { OnboardingTourProvider } from "@/components/onboarding/onboarding-tour-provider";

import { CurrencyProvider } from "@/components/currency-provider";
import { COMPANY_NAME } from "@/lib/branding";

interface AppShellProps {
  userRole: UserRole;
  userName: string;
  userId: string;
  currencySymbol?: string;
  companyName?: string;
  header: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({
  userRole,
  userName,
  userId,
  currencySymbol = "Rs.",
  companyName = COMPANY_NAME,
  header,
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <CurrencyProvider symbol={currencySymbol}>
    <MobileNavProvider open={mobileOpen} setOpen={setMobileOpen}>
      <OnboardingTourProvider userId={userId}>
        <div className="flex h-dvh overflow-hidden">
          <Sidebar userRole={userRole} userName={userName} companyName={companyName} />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {header}
            <main className="flex-1 overflow-y-auto overflow-x-hidden bg-muted/40 p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-5 sm:pt-5 md:p-6 lg:p-7">
              <div className="mx-auto w-full max-w-[1600px] min-w-0">{children}</div>
            </main>
          </div>
          <MobileTabBar userRole={userRole} />
          <MobileMoreSheet userRole={userRole} userName={userName} companyName={companyName} />
        </div>
      </OnboardingTourProvider>
    </MobileNavProvider>
    </CurrencyProvider>
  );
}
