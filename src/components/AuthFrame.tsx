"use client";

import { MapPin, Radio, Shield } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { BorderBeam } from "@/components/ui/border-beam";
import { FadeIn } from "@/components/motion";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description: string;
  eyebrow?: string;
  children: React.ReactNode;
};

const FEATURES = [
  {
    icon: MapPin,
    label: "Live map",
    detail: "ตำแหน่งอุปกรณ์แบบเรียลไทม์",
  },
  {
    icon: Radio,
    label: "Scalefusion",
    detail: "ซิงก์ฟลีทและสถานะแบตเตอรี่",
  },
  {
    icon: Shield,
    label: "Group ACL",
    detail: "สิทธิ์ Viewer ตามกลุ่ม",
  },
] as const;

export function AuthFrame({
  title,
  description,
  eyebrow = "Sign in",
  children,
}: Props) {
  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-[minmax(0,1.25fr)_minmax(400px,520px)]">
      <section className="relative hidden overflow-hidden bg-[oklch(0.14_0.045_255)] text-white lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-16 xl:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(1100px_620px_at_12%_8%,oklch(0.58_0.15_195_/_0.42),transparent_58%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(800px_480px_at_88%_88%,oklch(0.42_0.12_230_/_0.35),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,oklch(0.1_0.04_255_/_0.55))]" />

        <AnimatedGridPattern
          numSquares={42}
          maxOpacity={0.22}
          duration={3.2}
          className={cn(
            "[mask-image:radial-gradient(780px_circle_at_28%_38%,white,transparent)]",
            "inset-x-0 inset-y-[-30%] h-[160%] skew-y-6 fill-cyan-300/25 stroke-cyan-200/35"
          )}
        />

        <div
          aria-hidden
          className="pointer-events-none absolute right-[12%] top-[28%] size-40 rounded-full border border-cyan-300/25"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-[16%] top-[32%] size-24 rounded-full border border-cyan-200/40"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-[21%] top-[37%] size-3 rounded-full bg-cyan-300 shadow-[0_0_24px_8px_oklch(0.75_0.14_195_/_0.45)]"
        />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/90">
            Fleet Command
          </p>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium text-cyan-100/90 backdrop-blur-sm">
            <span className="size-1.5 animate-pulse rounded-full bg-status-online shadow-[0_0_8px_2px_oklch(0.72_0.17_155_/_0.55)]" />
            Systems online
          </span>
        </div>

        <div className="relative z-10 max-w-xl">
          <div className="mb-8 flex items-center gap-3">
            <span className="brand-mark size-5" aria-hidden />
            <span className="font-brand text-sm font-semibold tracking-[0.22em] text-cyan-200">
              SPGPS
            </span>
          </div>

          <h1 className="font-brand text-[4.25rem] font-semibold leading-[0.92] tracking-tight xl:text-[5.25rem]">
            Command
            <br />
            <span className="bg-gradient-to-r from-cyan-200 via-cyan-300 to-sky-300 bg-clip-text text-transparent">
              Deck
            </span>
          </h1>

          <p className="mt-7 max-w-md text-[1.05rem] leading-relaxed text-white/72">
            คอนโซลติดตามตำแหน่งจาก Scalefusion — แผนที่สด ประวัติเส้นทาง
            และการควบคุมสิทธิ์กลุ่มในที่เดียว
          </p>

          <ul className="mt-10 grid gap-3">
            {FEATURES.map(({ icon: Icon, label, detail }) => (
              <li
                key={label}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-sm"
              >
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-cyan-300/15 text-cyan-200">
                  <Icon className="size-4" />
                </span>
                <div>
                  <p className="text-[13px] font-semibold tracking-tight text-white">
                    {label}
                  </p>
                  <p className="mt-0.5 text-[12px] text-white/55">{detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-sm text-white/40">
          สำหรับผู้ใช้ภายในองค์กรเท่านั้น
        </p>
      </section>

      <section
        className="relative flex items-center justify-center overflow-hidden px-4 py-10 sm:px-8 sm:py-14"
        style={{
          paddingTop: "max(2.5rem, env(safe-area-inset-top))",
          paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(520px_280px_at_80%_0%,oklch(0.72_0.1_195_/_0.12),transparent_60%)] dark:bg-[radial-gradient(520px_280px_at_80%_0%,oklch(0.55_0.12_195_/_0.18),transparent_60%)]" />

        <div className="absolute right-3 top-3 z-10 sm:right-6 sm:top-6">
          <ThemeToggle />
        </div>

        <FadeIn className="relative z-10 w-full max-w-[420px]">
          <div className="relative overflow-hidden rounded-[1.35rem] border border-border/70 bg-card/95 p-5 shadow-[0_28px_90px_-36px_rgba(15,23,42,0.5)] backdrop-blur-sm sm:rounded-[1.6rem] sm:p-8">
            <BorderBeam
              size={140}
              duration={9}
              colorFrom="oklch(0.72 0.14 195)"
              colorTo="oklch(0.55 0.12 230)"
              borderWidth={1.5}
            />

            <div className="mb-8 flex items-center gap-2.5 lg:hidden">
              <span className="brand-mark" aria-hidden />
              <div>
                <p className="font-brand text-lg font-semibold leading-none tracking-tight">
                  SPGPS
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                  Command Deck
                </p>
              </div>
            </div>

            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              {eyebrow}
            </p>
            <h2 className="mt-2 font-brand text-[2.05rem] font-semibold leading-none tracking-tight">
              {title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
            {children}
          </div>
        </FadeIn>
      </section>
    </div>
  );
}
