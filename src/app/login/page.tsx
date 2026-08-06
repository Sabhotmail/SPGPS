"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetOk = searchParams.get("reset") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      return;
    }

    router.push("/map");
    router.refresh();
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-[1fr_420px]">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r p-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(160deg, oklch(0.94 0.04 205) 0%, oklch(0.97 0.02 220) 45%, oklch(0.985 0.01 230) 100%)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-16 top-24 size-72 rounded-full opacity-40"
          style={{
            background:
              "radial-gradient(circle, oklch(0.7 0.1 210 / 0.35), transparent 70%)",
          }}
          aria-hidden
        />
        <div className="relative">
          <div className="flex items-center gap-2.5">
            <span className="brand-mark" aria-hidden />
            <h1 className="text-2xl font-semibold tracking-tight">SPGPS</h1>
          </div>
          <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
            ติดตามตำแหน่งอุปกรณ์จาก Scalefusion และดูประวัติเส้นทางตามสิทธิ์กลุ่ม
          </p>
        </div>
        <p className="relative text-[12px] text-muted-foreground">
          สำหรับผู้ใช้ภายในองค์กรเท่านั้น
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[320px] animate-fade-up">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="brand-mark" aria-hidden />
            <h1 className="text-xl font-semibold tracking-tight">SPGPS</h1>
          </div>

          <h2 className="text-[15px] font-semibold">เข้าสู่ระบบ</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            ใช้บัญชีที่ Admin สร้างให้
          </p>

          {resetOk && (
            <p className="mt-4 text-[13px] text-muted-foreground">
              ตั้งรหัสผ่านใหม่แล้ว กรุณาเข้าสู่ระบบ
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px]">
                อีเมล
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[13px]">
                รหัสผ่าน
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-9"
              />
            </div>
            {error && (
              <p className="text-[13px] text-destructive">{error}</p>
            )}
            <Button type="submit" className="h-9 w-full" disabled={loading}>
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </Button>
          </form>

          <p className="mt-4 text-[13px]">
            <Link
              href="/forgot-password"
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              ลืมรหัสผ่าน?
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center text-[13px] text-muted-foreground">
          กำลังโหลด...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
