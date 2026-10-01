import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const AUTH_COOKIE_NAMES = [
  "__Secure-authjs.session-token",
  "__Host-authjs.session-token",
  "authjs.session-token",
  "__Secure-authjs.callback-url",
  "authjs.callback-url",
  "__Secure-authjs.csrf-token",
  "__Host-authjs.csrf-token",
  "authjs.csrf-token",
];

function isAuthCookie(name: string): boolean {
  return name.includes("authjs") || name.includes("next-auth");
}

/** Remove auth cookies from a middleware response to break redirect loops. */
export function clearAuthSessionCookies(
  response: NextResponse,
  request?: NextRequest
): NextResponse {
  const names = new Set(AUTH_COOKIE_NAMES);
  if (request) {
    for (const cookie of request.cookies.getAll()) {
      if (isAuthCookie(cookie.name)) {
        names.add(cookie.name);
      }
    }
  }

  for (const name of names) {
    const options = {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
    };
    response.cookies.set(name, "", options);
    // __Host- cookies must be cleared without a Domain and with Path=/ and Secure.
    if (name.startsWith("__Host-")) {
      response.cookies.set(name, "", {
        path: "/",
        maxAge: 0,
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      });
    }
  }

  return response;
}

export function hasAuthSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) => isAuthCookie(cookie.name));
}
