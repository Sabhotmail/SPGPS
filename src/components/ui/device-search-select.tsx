"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type DeviceOption = {
  id: string;
  employeeName: string;
  deviceName: string;
};

type Props = {
  devices: DeviceOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  className?: string;
};

export function DeviceSearchSelect({
  devices,
  value,
  onChange,
  placeholder = "ค้นหาพนักงานหรืออุปกรณ์",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = devices.find((d) => d.id === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter(
      (d) =>
        d.employeeName.toLowerCase().includes(q) ||
        d.deviceName.toLowerCase().includes(q)
    );
  }, [devices, query]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function selectDevice(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-[13px] outline-none transition-colors",
          "hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          open && "border-ring ring-3 ring-ring/50"
        )}
      >
        <span
          className={cn("min-w-0 truncate", !selected && "text-muted-foreground")}
        >
          {selected
            ? selected.employeeName || selected.deviceName
            : "เลือกพนักงาน"}
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-[1200] overflow-hidden rounded-lg border bg-popover shadow-md animate-fade-up">
          <div className="relative border-b px-2 py-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="h-8 w-full bg-transparent pl-8 pr-2 text-[13px] outline-none placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setOpen(false);
                  setQuery("");
                }
                if (e.key === "Enter" && filtered[0]) {
                  e.preventDefault();
                  selectDevice(filtered[0].id);
                }
              }}
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-[12px] text-muted-foreground">
                ไม่พบรายการ
              </li>
            ) : (
              filtered.map((d) => {
                const active = d.id === value;
                const title = d.employeeName || d.deviceName;
                const subtitle =
                  d.employeeName && d.employeeName !== d.deviceName
                    ? d.deviceName
                    : null;
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => selectDevice(d.id)}
                      className={cn(
                        "flex w-full flex-col items-start px-3 py-2 text-left transition-colors hover:bg-muted/50",
                        active && "bg-muted"
                      )}
                    >
                      <span className="truncate text-[13px] font-medium">
                        {title}
                      </span>
                      {subtitle && (
                        <span className="truncate text-[11px] text-muted-foreground">
                          {subtitle}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
