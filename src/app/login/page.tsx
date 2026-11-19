"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { AuthFrame } from "@/components/AuthFrame";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShimmerButton } from "@/components/ui/shimmer-button";

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
    <AuthFrame
      eyebrow="Secure access"
      title="เข้าสู่ระบบ"
      description="ใช้บัญชีที่ Admin สร้างให้เพื่อเปิด Command Deck"
    >
      {resetOk && (
        <div
          className="mt-5 flex items-start gap-2.5 rounded-2xl border border-status-online/25 bg-status-online/10 px-3.5 py-3 text-[13px] text-foreground"
          role="status"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-status-online" />
          <span>ตั้งรหัสผ่านใหม่แล้ว กรุณาเข้าสู่ระบบ</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
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
            placeholder="you@company.com"
            className="h-11 rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="password" className="text-[13px]">
              รหัสผ่าน
            </Label>
            <Link
              href="/forgot-password"
              className="text-[12px] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              ลืมรหัสผ่าน?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="h-11 rounded-xl"
          />
        </div>

        {error && (
          <p
            className="rounded-xl border border-destructive/25 bg-destructive/10 px-3.5 py-2.5 text-[13px] text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}

        <ShimmerButton
          type="submit"
          disabled={loading}
          borderRadius="12px"
          background="oklch(0.55 0.14 195)"
          shimmerColor="#ecfeff"
          className="mt-1 h-11 w-full cursor-pointer px-5 text-[15px] font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="inline-flex items-center gap-2">
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            {!loading && <ArrowRight className="size-4" />}
          </span>
        </ShimmerButton>
      </form>

      <p className="mt-6 text-center text-[12px] text-muted-foreground">
        เข้าสู่ระบบแล้วจะไปที่แผนที่สดของฟลีท
      </p>
    </AuthFrame>
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
