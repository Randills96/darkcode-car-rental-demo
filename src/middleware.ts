import { auth } from "@/lib/auth";
import { canAccessRoute } from "@/lib/permissions";
import { safeCallbackPath } from "@/lib/auth/auth-url";
import {
  clearAuthSessionCookies,
  hasAuthSessionCookie,
} from "@/lib/auth/session-cookies";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const sessionExpired = req.auth?.error === "SessionExpired";
  const accountInactive = req.auth?.error === "AccountInactive";
  const sessionInvalid = sessionExpired || accountInactive;
  const isLoggedIn = !!req.auth?.user && !sessionInvalid;
  const isAuthPage = pathname.startsWith("/login");

  // Never redirect /login to itself — that is what caused ERR_TOO_MANY_REDIRECTS
  // after idle timeout (session cookie still present with SessionExpired).
  if (isAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    if (sessionInvalid || hasAuthSessionCookie(req)) {
      return clearAuthSessionCookies(NextResponse.next(), req);
    }
    return NextResponse.next();
  }

  if (sessionInvalid || !isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    if (sessionExpired) {
      loginUrl.searchParams.set("reason", "idle");
    } else if (accountInactive) {
      loginUrl.searchParams.set("reason", "inactive");
    }
    loginUrl.searchParams.set("callbackUrl", safeCallbackPath(pathname));
    return clearAuthSessionCookies(NextResponse.redirect(loginUrl), req);
  }

  const role = req.auth?.user?.role;
  if (role && !canAccessRoute(role, pathname)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
