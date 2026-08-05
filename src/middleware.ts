export { middlewareAuth as middleware } from "@/lib/auth-edge";

export const config = {
  matcher: [
    "/login",
    "/map/:path*",
    "/history/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/locations/:path*",
    "/api/devices/:path*",
    "/api/groups/:path*",
    "/api/sync/:path*",
  ],
};
