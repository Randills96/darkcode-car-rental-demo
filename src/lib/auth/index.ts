import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import type { UserRole } from "@prisma/client";
import { IDLE_TIMEOUT_MS, isSessionIdleExpired } from "@/lib/auth/session-timeout";
import { applyAuthUrlEnv } from "@/lib/auth/auth-url";
import {
  expireUserIfSubscriptionDue,
  isAnnualFeeRole,
} from "@/lib/services/user-subscription";

applyAuthUrlEnv();

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
    };
    lastActivity?: number;
    error?: "SessionExpired" | "AccountInactive";
  }

  interface User {
    role: UserRole;
    subscriptionExpiresAt?: number | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    lastActivity?: number;
    subscriptionExpiresAt?: number | null;
    error?: "SessionExpired" | "AccountInactive";
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || user.deletedAt) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          return null;
        }

        const current = await expireUserIfSubscriptionDue(user);

        if (current.status !== "ACTIVE") {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          subscriptionExpiresAt: current.subscriptionExpiresAt?.getTime() ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      const now = Date.now();

      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.lastActivity = now;
        token.subscriptionExpiresAt = user.subscriptionExpiresAt ?? null;
        delete token.error;
        return token;
      }

      if (trigger === "update" && session && typeof session.lastActivity === "number") {
        token.lastActivity = session.lastActivity;
        delete token.error;
        return token;
      }

      if (isSessionIdleExpired(token.lastActivity, now)) {
        token.error = "SessionExpired";
        return token;
      }

      if (
        isAnnualFeeRole(token.role) &&
        token.subscriptionExpiresAt != null &&
        now >= token.subscriptionExpiresAt
      ) {
        token.error = "AccountInactive";
        return token;
      }

      return token;
    },
    async session({ session, token }) {
      if (token.error === "SessionExpired" || token.error === "AccountInactive") {
        return { expires: session.expires, error: token.error };
      }

      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.lastActivity = token.lastActivity;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  trustHost: true,
});
