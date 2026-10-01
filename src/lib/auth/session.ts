import { cache } from "react";
import { auth } from "@/lib/auth";
import { hasPermission, type Permission } from "@/lib/permissions";
import { isDriverRole } from "@/lib/auth/driver-access";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export class ApiAuthError extends Error {
  constructor(public response: NextResponse) {
    super("API authentication failed");
    this.name = "ApiAuthError";
  }
}

export const getSession = cache(async () => auth());

export async function requireAuth() {
  const session = await getSession();
  if (
    !session?.user ||
    session.error === "SessionExpired" ||
    session.error === "AccountInactive"
  ) {
    redirect("/login");
  }
  return session;
}

export async function requirePermission(permission: Permission) {
  const session = await requireAuth();
  if (!hasPermission(session.user.role, permission)) {
    redirect("/");
  }
  return session;
}

/** Use in Route Handlers — returns JSON 401/403 instead of redirecting. */
export async function requirePermissionApi(permission: Permission) {
  const session = await getSession();
  if (!session?.user) {
    throw new ApiAuthError(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
  }
  if (!hasPermission(session.user.role, permission)) {
    throw new ApiAuthError(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );
  }
  return session;
}

/** Pages that must not be opened by DRIVER via a guessed record URL. */
export async function requireNonDriver(permission: Permission) {
  const session = await requirePermission(permission);
  if (isDriverRole(session.user.role)) {
    redirect("/");
  }
  return session;
}

export async function requireNonDriverApi(permission: Permission) {
  const session = await requirePermissionApi(permission);
  if (isDriverRole(session.user.role)) {
    throw new ApiAuthError(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );
  }
  return session;
}

export async function getCurrentUser() {
  const session = await requireAuth();
  return session.user;
}
