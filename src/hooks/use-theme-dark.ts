"use client";

import { useEffect, useState } from "react";

export const THEME_CHANGE_EVENT = "spgps-theme-change";

function readDark(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

/** React to light/dark toggles (class on <html> + custom event). */
export function useThemeDark(): boolean {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(readDark());

    const onCustom = () => setDark(readDark());
    window.addEventListener(THEME_CHANGE_EVENT, onCustom);

    const observer = new MutationObserver(() => setDark(readDark()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, onCustom);
      observer.disconnect();
    };
  }, []);

  return dark;
}
