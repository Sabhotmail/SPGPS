import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  // Required for `next start` / reverse proxies (Auth.js UntrustedHost)
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" as const },
  callbacks: {
    // Prefer relative redirects so the browser keeps the Host the user opened
    // (public IP, Tailscale, LAN) instead of forcing localhost.
    redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return url;

      try {
        const target = new URL(url);
        const base = new URL(baseUrl);
        if (target.origin === base.origin) return url;
      } catch {
        /* fall through */
      }

      return url.startsWith("/") ? url : baseUrl;
    },
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
