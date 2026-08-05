import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  // Required for `next start` / reverse proxies (Auth.js UntrustedHost)
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" as const },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage = nextUrl.pathname.startsWith("/login");
      const isProtected =
        nextUrl.pathname.startsWith("/map") ||
        nextUrl.pathname.startsWith("/history") ||
        nextUrl.pathname.startsWith("/admin") ||
        nextUrl.pathname.startsWith("/api/admin") ||
        nextUrl.pathname.startsWith("/api/locations") ||
        nextUrl.pathname.startsWith("/api/devices") ||
        nextUrl.pathname.startsWith("/api/groups") ||
        nextUrl.pathname.startsWith("/api/sync");

      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL("/map", nextUrl));
      }

      if (isProtected && !isLoggedIn) {
        if (nextUrl.pathname.startsWith("/api/")) {
          return false;
        }
        return Response.redirect(new URL("/login", nextUrl));
      }

      if (
        (nextUrl.pathname.startsWith("/admin") ||
          nextUrl.pathname.startsWith("/api/admin") ||
          nextUrl.pathname.startsWith("/api/sync")) &&
        auth?.user?.role !== "ADMIN"
      ) {
        if (nextUrl.pathname.startsWith("/api/")) {
          return false;
        }
        return Response.redirect(new URL("/map", nextUrl));
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "VIEWER";
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
