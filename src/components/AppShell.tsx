"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Map,
  History,
  Smartphone,
  Users,
  FolderKanban,
  KeyRound,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  Menu,
  Radio,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PageTransition } from "@/components/motion";
import { PresenceHeartbeat } from "@/components/PresenceHeartbeat";

type Props = {
  role: "ADMIN" | "VIEWER";
  email: string;
  children: React.ReactNode;
  fullBleed?: boolean;
};

const STORAGE_KEY = "spgps-sidebar-collapsed";

async function handleSignOut() {
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
  { href: "/admin/online", label: "Online", icon: Radio },
  { href: "/admin/mobile", label: "แอพมือถือ", icon: KeyRound },
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
        "group flex min-h-10 cursor-pointer items-center rounded-xl text-sm transition-all duration-200",
        collapsed ? "justify-center px-0" : "gap-3 px-3",
        active
          ? "ink-nav-active font-semibold"
          : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground"
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0 transition-colors duration-200",
          active ? "text-sidebar-primary" : "opacity-80 group-hover:opacity-100"
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
        "flex min-h-12 min-w-0 flex-1 cursor-pointer flex-col items-center gap-0.5 px-1 py-1.5 text-[11px] transition-colors duration-200",
        active
          ? "font-semibold text-primary"
          : "text-muted-foreground active:text-foreground"
      )}
    >
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-full transition-colors duration-200",
          active && "bg-primary/15"
        )}
      >
        <Icon className="size-5 shrink-0" strokeWidth={active ? 2.4 : 1.75} />
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function AppShell({ role, email, children, fullBleed }: Props) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
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
    <div
      className="flex h-dvh overflow-hidden bg-background"
      data-testid="app-shell"
    >
      <PresenceHeartbeat />
      <aside
        className={cn(
          "relative hidden h-full shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out md:flex",
          "before:pointer-events-none before:absolute before:inset-y-0 before:right-0 before:w-px before:bg-gradient-to-b before:from-transparent before:via-sidebar-primary/40 before:to-transparent",
          ready ? (collapsed ? "w-[76px]" : "w-[248px]") : "w-[248px]"
        )}
        data-testid="app-sidebar"
      >
        <div
          className={cn(
            "flex items-start gap-2 pb-2 pt-6",
            collapsed ? "flex-col items-center px-2" : "px-4"
          )}
        >
          <Link
            href="/map"
            className={cn(
              "min-w-0 flex-1 cursor-pointer",
              collapsed && "text-center"
            )}
            title="SPGPS"
          >
            <span
              className={cn(
                "font-brand flex items-center gap-2.5 text-[1.35rem] font-semibold tracking-tight text-sidebar-foreground",
                collapsed && "justify-center text-base"
              )}
            >
              <span className="brand-mark" aria-hidden />
              {!collapsed && "SPGPS"}
            </span>
            {!collapsed && (
              <span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.22em] text-sidebar-primary">
                SiriPro GPS
              </span>
            )}
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 cursor-pointer text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
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
            "mt-4 flex-1 space-y-6 overflow-y-auto overflow-x-hidden",
            collapsed ? "px-2" : "px-3"
          )}
          aria-label="เมนูหลัก"
        >
          <div className="space-y-1">
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
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/40">
                  Admin
                </p>
              )}
              {collapsed && (
                <div className="mx-auto mb-2 h-px w-8 bg-sidebar-border" />
              )}
              <div className="space-y-1">
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
            "mt-auto border-t border-sidebar-border/80",
            collapsed ? "p-2" : "p-4"
          )}
        >
          <div
            className={cn(
              "mb-3 flex",
              collapsed ? "justify-center" : "justify-end"
            )}
          >
            <ThemeToggle className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground" />
          </div>
          {!collapsed && (
            <div className="mb-3 rounded-xl bg-sidebar-accent/70 px-3 py-2.5">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {email}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold tracking-[0.14em] text-sidebar-primary">
                {role}
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size={collapsed ? "icon-sm" : "sm"}
            className={cn(
              "cursor-pointer text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              collapsed
                ? "mx-auto"
                : "h-9 w-full justify-start gap-2 px-3 text-[13px]"
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

      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[1200] md:hidden">
            <motion.button
              type="button"
              className="absolute inset-0 cursor-pointer bg-[var(--scrim)]"
              aria-label="ปิดเมนู"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              className="absolute inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] rounded-2xl border border-border/70 bg-card p-4 shadow-2xl"
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{email}</p>
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-primary">
                    {role}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <ThemeToggle />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="cursor-pointer"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="ปิด"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
              {role === "ADMIN" && (
                <div className="space-y-1 border-t border-border/70 pt-3">
                  {adminLinks.map((link) => {
                    const Icon = link.icon;
                    const active = pathname.startsWith(link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-200",
                          active
                            ? "bg-primary/10 font-semibold text-primary"
                            : "text-muted-foreground active:bg-muted"
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
                className="mt-3 h-11 w-full cursor-pointer justify-start gap-3 rounded-xl px-3 text-sm text-muted-foreground"
                onClick={() => void handleSignOut()}
              >
                <LogOut className="size-4" />
                ออกจากระบบ
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <main
          className={cn(
            "min-h-0 min-w-0 flex-1",
            bleed
              ? "flex flex-col overflow-hidden p-0 md:p-3"
              : "overflow-y-auto overflow-x-hidden px-3 py-5 sm:px-4 sm:py-6 md:px-10 md:py-9",
            "pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-3"
          )}
        >
          <PageTransition
            key={pathname}
            className={cn(
              "min-w-0",
              bleed &&
                "min-h-0 overflow-hidden md:rounded-2xl md:border md:border-border/50 md:bg-card/40 md:shadow-sm"
            )}
          >
            {children}
          </PageTransition>
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-[1100] flex border-t border-border/70 bg-card/95 backdrop-blur-xl md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          aria-label="เมนูมือถือ"
          data-testid="mobile-tabs"
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
              "flex min-h-12 min-w-0 flex-1 cursor-pointer flex-col items-center gap-0.5 px-1 py-1.5 text-[11px] transition-colors duration-200",
              mobileMenuOpen || pathname.startsWith("/admin")
                ? "font-semibold text-primary"
                : "text-muted-foreground"
            )}
            aria-expanded={mobileMenuOpen}
            aria-label="เปิดเมนูเพิ่มเติม"
          >
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full",
                (mobileMenuOpen || pathname.startsWith("/admin")) &&
                  "bg-primary/15"
              )}
            >
              <Menu className="size-5 shrink-0" />
            </span>
            <span>เมนู</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
