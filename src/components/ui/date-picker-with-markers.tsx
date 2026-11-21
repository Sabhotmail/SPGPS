"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { formatYmdInAppTz, todayYmdInAppTz } from "@/lib/app-timezone";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const POPOVER_WIDTH = 280;
const POPOVER_GAP = 4;

function parseYmd(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

function formatDisplay(value: string): string {
  if (!value) return "เลือกวันที่";
  const d = parseYmd(value);
  return d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type Props = {
  value: string;
  onChange: (date: string) => void;
  /** YYYY-MM-DD → point count */
  datesWithData: Record<string, number>;
  disabled?: boolean;
  className?: string;
};

type PopoverPos = {
  top: number;
  left: number;
};

export function DatePickerWithMarkers({
  value,
  onChange,
  datesWithData,
  disabled,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<PopoverPos | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const selected = value ? parseYmd(value) : new Date();
  const [view, setView] = useState(
    () => new Date(selected.getFullYear(), selected.getMonth(), 1)
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (value) {
      const d = parseYmd(value);
      setView(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [value]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }

    function updatePosition() {
      const trigger = triggerRef.current;
      const popover = popoverRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const popoverHeight = popover?.offsetHeight ?? 320;
      const spaceBelow = window.innerHeight - rect.bottom - POPOVER_GAP;
      const spaceAbove = rect.top - POPOVER_GAP;
      const placeBelow =
        spaceBelow >= popoverHeight || spaceBelow >= spaceAbove;

      let left = rect.left;
      left = Math.min(left, window.innerWidth - POPOVER_WIDTH - 8);
      left = Math.max(8, left);

      const top = placeBelow
        ? rect.bottom + POPOVER_GAP
        : Math.max(8, rect.top - POPOVER_GAP - popoverHeight);

      setPos({ top, left });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, view]);

  const cells = useMemo(() => {
    const year = view.getFullYear();
    const month = view.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();

    const list: {
      date: string;
      day: number;
      inMonth: boolean;
      hasData: boolean;
      count: number;
    }[] = [];

    for (let i = 0; i < firstDow; i++) {
      const day = prevDays - firstDow + 1 + i;
      const d = new Date(year, month - 1, day);
      const date = formatYmdInAppTz(d);
      list.push({
        date,
        day,
        inMonth: false,
        hasData: (datesWithData[date] ?? 0) > 0,
        count: datesWithData[date] ?? 0,
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = formatYmdInAppTz(new Date(year, month, day));
      list.push({
        date,
        day,
        inMonth: true,
        hasData: (datesWithData[date] ?? 0) > 0,
        count: datesWithData[date] ?? 0,
      });
    }

    while (list.length % 7 !== 0) {
      const day = list.length - (firstDow + daysInMonth) + 1;
      const d = new Date(year, month + 1, day);
      const date = formatYmdInAppTz(d);
      list.push({
        date,
        day,
        inMonth: false,
        hasData: (datesWithData[date] ?? 0) > 0,
        count: datesWithData[date] ?? 0,
      });
    }

    return list;
  }, [view, datesWithData]);

  const monthLabel = view.toLocaleDateString("th-TH", {
    month: "long",
    year: "numeric",
  });

  const today = todayYmdInAppTz();

  const popover =
    open && mounted
      ? createPortal(
          <div
            ref={popoverRef}
            className="fixed z-[1300] w-[280px] rounded-lg border bg-popover p-3 shadow-md animate-fade-up"
            style={{
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
              visibility: pos ? "visible" : "hidden",
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() =>
                  setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))
                }
                aria-label="เดือนก่อน"
              >
                <ChevronLeft className="size-4" />
              </button>
              <p className="text-[13px] font-medium">{monthLabel}</p>
              <button
                type="button"
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() =>
                  setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))
                }
                aria-label="เดือนถัดไป"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-0.5">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="py-1 text-center text-[10px] text-muted-foreground"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((cell) => {
                const selectedDay = cell.date === value;
                return (
                  <button
                    key={cell.date + String(cell.inMonth)}
                    type="button"
                    title={
                      cell.hasData
                        ? `${cell.date} · ${cell.count} จุด`
                        : cell.date
                    }
                    onClick={() => {
                      onChange(cell.date);
                      setOpen(false);
                    }}
                    className={cn(
                      "relative flex h-8 flex-col items-center justify-center rounded-md text-[12px] transition-colors",
                      !cell.inMonth && "text-muted-foreground/40",
                      cell.inMonth && !selectedDay && "hover:bg-muted",
                      selectedDay && "bg-foreground text-background",
                      cell.date === today &&
                        !selectedDay &&
                        "ring-1 ring-border"
                    )}
                  >
                    <span className="leading-none">{cell.day}</span>
                    {cell.hasData && (
                      <span
                        className={cn(
                          "mt-0.5 size-1 rounded-full",
                          selectedDay ? "bg-background" : "bg-foreground"
                        )}
                        aria-hidden
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between border-t pt-2">
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="size-1 rounded-full bg-foreground" />
                มีข้อมูลพิกัด
              </p>
              <button
                type="button"
                className="text-[12px] text-foreground hover:underline"
                onClick={() => {
                  onChange(today);
                  setOpen(false);
                }}
              >
                วันนี้
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-[13px] outline-none transition-colors",
          "hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:pointer-events-none disabled:opacity-50",
          open && "border-ring ring-3 ring-ring/50"
        )}
      >
        <span className={cn("truncate", !value && "text-muted-foreground")}>
          {formatDisplay(value)}
        </span>
        <CalendarDays className="size-3.5 shrink-0 text-muted-foreground" />
      </button>
      {popover}
    </div>
  );
}
