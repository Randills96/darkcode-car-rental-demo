"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand-logo";
import { COMPANY_NAME, COMPANY_TAGLINE } from "@/lib/branding";
import { safeCallbackPath } from "@/lib/auth/auth-url";
import { IDLE_ACTIVITY_STORAGE_KEY } from "@/lib/auth/session-timeout";
import { getInactiveLoginHint } from "@/app/login/actions";

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackPath(searchParams.get("callbackUrl"));
  const idleTimeout = searchParams.get("reason") === "idle";
  const inactiveAccount = searchParams.get("reason") === "inactive";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    localStorage.removeItem(IDLE_ACTIVITY_STORAGE_KEY);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      const hint = await getInactiveLoginHint(email);
      setLoading(false);
      setError(
        hint ??
          (inactiveAccount
            ? "Your account is deactivated. Pay the annual fee to the company bank account, then ask Super Admin to activate it."
            : "Invalid email or password")
      );
      return;
    }

    localStorage.setItem(IDLE_ACTIVITY_STORAGE_KEY, String(Date.now()));
    window.location.assign(callbackUrl);
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <BrandLogo size={128} priority className="mx-auto mb-4 rounded-xl shadow-md" />
        <CardTitle className="text-2xl tracking-tight">{COMPANY_NAME}</CardTitle>
        <CardDescription>
          {COMPANY_TAGLINE}
          <span className="mt-1 block">Sign in to the back office</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {idleTimeout && (
            <div className="rounded-md bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
              You were signed out after 10 minutes of inactivity. Please sign in again.
            </div>
          )}
          {inactiveAccount && !error && (
            <div className="rounded-md bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
              This Manager or Staff account is deactivated. Pay the annual fee to the company bank
              account, then ask Super Admin to activate it.
            </div>
          )}
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@darkcode.lk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
