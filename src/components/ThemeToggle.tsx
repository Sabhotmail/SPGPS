"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { THEME_CHANGE_EVENT } from "@/hooks/use-theme-dark";

const STORAGE_KEY = "spgps-theme";

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // ignore
    }
    setDark(next);
    window.dispatchEvent(
      new CustomEvent(THEME_CHANGE_EVENT, { detail: { dark: next } })
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={className}
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? "สลับเป็นโหมดสว่าง" : "สลับเป็นโหมดมืด"}
      title={dark ? "โหมดสว่าง" : "โหมดมืด"}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
