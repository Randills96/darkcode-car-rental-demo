"use client";

import { SessionProvider } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { IdleSessionGuard } from "@/components/auth/idle-session-guard";
import { RestoreForegroundTab } from "@/components/layout/restore-foreground-tab";

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname.startsWith("/login");

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      {isLogin ? (
        <>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </>
      ) : (
        <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
          <IdleSessionGuard />
          <RestoreForegroundTab />
          {children}
          <Toaster position="top-right" richColors closeButton />
        </SessionProvider>
      )}
    </ThemeProvider>
  );
}
