"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  Map,
  History,
  Smartphone,
  Users,
  FolderKanban,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = {
  role: "ADMIN" | "VIEWER";
  email: string;
  children: React.ReactNode;
  fullBleed?: boolean;
};

const STORAGE_KEY = "spgps-sidebar-collapsed";

async function handleSignOut() {
  // Avoid Auth.js absolute redirects to http://0.0.0.0:3000 when the
  // server is bound with -H 0.0.0.0 — keep the browser's current host.
  await signOut({ redirect: false });
  window.location.assign("/login");
}

const mainLinks = [
  { href: "/map", label: "ตำแหน่ง", icon: Map },
  { href: "/history", label: "ประวัติ", icon: History },
];

const adminLinks = [
  { href: "/admin/devices", label: "อุปกรณ์", icon: Smartphone },
  { href: "/admin/groups", label: "กลุ่ม", icon: FolderKanban },
  { href: "/admin/users", label: "ผู้ใช้", icon: Users },
];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "group relative flex items-center rounded-sm text-[13px] transition-colors",
        collapsed ? "justify-center px-0 py-2" : "gap-2.5 py-1.5 pl-3 pr-2",
        active
          ? "bg-sidebar-accent/70 font-medium text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/40 hover:text-foreground"
      )}
    >
      {active && !collapsed && (
        <span className="absolute inset-y-1 left-0 w-0.5 origin-center rounded-full bg-primary animate-nav-in" />
      )}
      {active && collapsed && (
        <span className="absolute inset-y-1.5 left-0 w-0.5 origin-center rounded-full bg-primary animate-nav-in" />
      )}
      <Icon
        className={cn(
          "size-[15px] shrink-0 transition-opacity",
          active ? "opacity-100 text-primary" : "opacity-70 group-hover:opacity-100"
        )}
      />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

function MobileTabLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-1.5 text-[10px] transition-colors",
        active
          ? "font-medium text-primary"
          : "text-muted-foreground active:text-foreground"
      )}
    >
      <Icon className="size-5 shrink-0" strokeWidth={active ? 2.25 : 1.75} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function AppShell({ role, email, children, fullBleed }: Props) {
  const pathname = usePathname();
  const bleed =
    fullBleed ??
    (pathname.startsWith("/map") || pathname.startsWith("/history"));
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out md:flex",
          ready ? (collapsed ? "w-[64px]" : "w-[220px]") : "w-[220px]"
        )}
      >
        <div
          className={cn(
            "flex items-start gap-2 py-4",
            collapsed ? "flex-col items-center px-2" : "px-3"
          )}
        >
          <Link
            href="/map"
            className={cn("min-w-0 flex-1", collapsed && "text-center")}
            title="SPGPS"
          >
            <span
              className={cn(
                "flex items-center gap-2 text-[15px] font-semibold tracking-tight text-foreground",
                collapsed && "justify-center"
              )}
            >
              <span className="brand-mark" aria-hidden />
              {!collapsed && "SPGPS"}
            </span>
            {!collapsed && (
              <span className="mt-0.5 block pl-4 text-[11px] text-muted-foreground">
                Fleet tracking
              </span>
            )}
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={toggleCollapsed}
            title={collapsed ? "ขยายเมนู" : "ยุบเมนู"}
            aria-label={collapsed ? "ขยายเมนู" : "ยุบเมนู"}
          >
            {collapsed ? (
              <PanelLeft className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </Button>
        </div>

        <nav
          className={cn(
            "flex-1 space-y-5 overflow-y-auto overflow-x-hidden",
            collapsed ? "px-1.5" : "px-2"
          )}
        >
          <div className="space-y-0.5">
            {mainLinks.map((link) => (
              <NavLink
                key={link.href}
                {...link}
                collapsed={collapsed}
                active={pathname.startsWith(link.href)}
              />
            ))}
          </div>

          {role === "ADMIN" && (
            <div>
              {!collapsed && (
                <p className="mb-2 px-3 text-[11px] text-muted-foreground/70">
                  การตั้งค่า
                </p>
              )}
              {collapsed && (
                <div className="mx-auto mb-2 h-px w-6 bg-border" />
              )}
              <div className="space-y-0.5">
                {adminLinks.map((link) => (
                  <NavLink
                    key={link.href}
                    {...link}
                    collapsed={collapsed}
                    active={pathname.startsWith(link.href)}
                  />
                ))}
              </div>
            </div>
          )}
        </nav>

        <div
          className={cn(
            "border-t border-sidebar-border",
            collapsed ? "p-2" : "p-3"
          )}
        >
          {!collapsed && (
            <>
              <p className="truncate px-1 text-[12px] text-foreground">
                {email}
              </p>
              <p className="mt-0.5 px-1 text-[11px] text-muted-foreground">
                {role}
              </p>
            </>
          )}
          <Button
            variant="ghost"
            size={collapsed ? "icon-sm" : "sm"}
            className={cn(
              "text-muted-foreground hover:text-foreground",
              collapsed
                ? "mx-auto mt-0"
                : "mt-2 h-8 w-full justify-start px-2 text-[13px]"
            )}
            onClick={() => void handleSignOut()}
            title="ออกจากระบบ"
            aria-label="ออกจากระบบ"
          >
            <LogOut className="size-3.5" />
            {!collapsed && "ออกจากระบบ"}
          </Button>
        </div>
      </aside>

      {/* Mobile more-menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[1200] md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/20 animate-in fade-in-0"
            aria-label="ปิดเมนู"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute inset-x-3 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] rounded-xl border bg-background p-3 shadow-lg animate-in fade-in-0 slide-in-from-bottom-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium">{email}</p>
                <p className="text-[11px] text-muted-foreground">{role}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="ปิด"
              >
                <X className="size-4" />
              </Button>
            </div>
            {role === "ADMIN" && (
              <div className="space-y-0.5 border-t pt-2">
                {adminLinks.map((link) => {
                  const Icon = link.icon;
                  const active = pathname.startsWith(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[13px]",
                        active
                          ? "bg-accent font-medium text-foreground"
                          : "text-muted-foreground active:bg-accent/60"
                      )}
                    >
                      <Icon className="size-4" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            )}
            <Button
              variant="ghost"
              className="mt-2 h-10 w-full justify-start gap-2.5 px-3 text-[13px] text-muted-foreground"
              onClick={() => void handleSignOut()}
            >
              <LogOut className="size-4" />
              ออกจากระบบ
            </Button>
          </div>
        </div>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <main
          className={cn(
            "min-h-0 min-w-0 flex-1",
            bleed
              ? "flex flex-col overflow-hidden"
              : "overflow-y-auto px-4 py-5 md:px-10 md:py-8",
            // Leave room for mobile bottom tabs
            "pb-[calc(3.75rem+env(safe-area-inset-bottom))] md:pb-0"
          )}
        >
          {children}
        </main>

        {/* Mobile bottom tabs */}
        <nav
          className="fixed inset-x-0 bottom-0 z-[1100] flex border-t bg-background/95 backdrop-blur-sm md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {mainLinks.map((link) => (
            <MobileTabLink
              key={link.href}
              {...link}
              active={pathname.startsWith(link.href)}
            />
          ))}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((o) => !o)}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-1.5 text-[10px] transition-colors",
              mobileMenuOpen || pathname.startsWith("/admin")
                ? "font-medium text-foreground"
                : "text-muted-foreground"
            )}
          >
            <Menu className="size-5 shrink-0" />
            <span>เมนู</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
