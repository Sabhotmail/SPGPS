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

const mainLinks = [
  { href: "/map", label: "ตำแหน่งปัจจุบัน", icon: Map },
  { href: "/history", label: "ประวัติเส้นทาง", icon: History },
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
          ? "font-medium text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {active && !collapsed && (
        <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-foreground" />
      )}
      {active && collapsed && (
        <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-foreground" />
      )}
      <Icon className="size-[15px] shrink-0 opacity-70 group-hover:opacity-100" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

export function AppShell({ role, email, children, fullBleed }: Props) {
  const pathname = usePathname();
  const bleed = fullBleed ?? pathname.startsWith("/map");
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

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
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "sticky top-0 flex h-svh shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out",
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
            <span className="block text-[15px] font-semibold tracking-tight text-foreground">
              {collapsed ? "SP" : "SPGPS"}
            </span>
            {!collapsed && (
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
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
              collapsed ? "mx-auto mt-0" : "mt-2 h-8 w-full justify-start px-2 text-[13px]"
            )}
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="ออกจากระบบ"
            aria-label="ออกจากระบบ"
          >
            <LogOut className="size-3.5" />
            {!collapsed && "ออกจากระบบ"}
          </Button>
        </div>
      </aside>

      <main
        className={cn(
          "min-w-0 flex-1",
          bleed ? "flex flex-col overflow-hidden" : "px-10 py-8"
        )}
      >
        {children}
      </main>
    </div>
  );
}
