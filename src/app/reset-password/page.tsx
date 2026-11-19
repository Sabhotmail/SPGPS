"use client";

import Link from "next/link";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AuthFrame } from "@/components/AuthFrame";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(
    () => searchParams.get("token")?.trim() ?? "",
    [searchParams]
  );

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("ลิงก์ไม่ถูกต้อง");
      return;
    }
    if (password !== confirm) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.error === "string" ? data.error : "ตั้งรหัสผ่านไม่สำเร็จ"
        );
        return;
      }
      router.push("/login?reset=1");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="mt-7 space-y-4">
        <p
          className="rounded-xl border border-destructive/25 bg-destructive/10 px-3.5 py-2.5 text-[13px] text-destructive"
          role="alert"
        >
          ไม่พบโทเค็นในลิงก์ กรุณาขอรีเซ็ตใหม่
        </p>
        <Link
          href="/forgot-password"
          className="inline-flex text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ไปหน้าลืมรหัสผ่าน
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-[13px]">
          รหัสผ่านใหม่
        </Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="อย่างน้อย 6 ตัวอักษร"
          className="h-11 rounded-xl"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm" className="text-[13px]">
          ยืนยันรหัสผ่าน
        </Label>
        <Input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="พิมพ์ซ้ำอีกครั้ง"
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
      <Button
        type="submit"
        className="h-11 w-full cursor-pointer rounded-xl text-[15px] font-semibold"
        disabled={loading}
      >
        {loading ? "กำลังบันทึก..." : "ตั้งรหัสผ่านใหม่"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthFrame
      eyebrow="Recovery"
      title="ตั้งรหัสผ่านใหม่"
      description="รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"
    >
      <Suspense
        fallback={
          <p className="mt-8 text-sm text-muted-foreground">กำลังโหลด...</p>
        }
      >
        <ResetPasswordForm />
      </Suspense>
      <p className="mt-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          กลับไปเข้าสู่ระบบ
        </Link>
      </p>
    </AuthFrame>
  );
}
