import { Suspense } from "react";
import { AppShell } from "./app-shell";
import { Header } from "./header";
import { HeaderWithNotifications } from "./header-with-notifications";
import { requireAuth } from "@/lib/auth/session";
import { getSystemSettings } from "@/lib/services/settings";
import { setDefaultCurrencySymbol } from "@/lib/utils";
import { COMPANY_NAME } from "@/lib/branding";

interface DashboardShellProps {
  children: React.ReactNode;
  title?: string;
}

function HeaderFallback({ title, companyName }: { title?: string; companyName?: string }) {
  return (
    <Header
      title={title}
      userName=""
      userRole="EMPLOYEE"
      notificationCount={0}
      companyName={companyName ?? COMPANY_NAME}
    />
  );
}

export async function DashboardShell({ children, title }: DashboardShellProps) {
  const [session, settings] = await Promise.all([requireAuth(), getSystemSettings()]);
  setDefaultCurrencySymbol(settings.currency_symbol);

  return (
    <AppShell
      userRole={session.user.role}
      userName={session.user.name}
      userId={session.user.id}
      currencySymbol={settings.currency_symbol}
      companyName={settings.company_name}
      header={
        <Suspense fallback={<HeaderFallback title={title} companyName={settings.company_name} />}>
          <HeaderWithNotifications
            title={title}
            userName={session.user.name}
            userRole={session.user.role}
            userId={session.user.id}
            companyName={settings.company_name}
          />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  );
}
