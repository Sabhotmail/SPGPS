"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
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
      <div className="space-y-3">
        <p className="text-[13px] text-destructive">
          ไม่พบโทเค็นในลิงก์ กรุณาขอรีเซ็ตใหม่
        </p>
        <Link
          href="/forgot-password"
          className="text-[13px] underline-offset-4 hover:underline"
        >
          ไปหน้าลืมรหัสผ่าน
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
          className="h-9"
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
          className="h-9"
        />
      </div>
      {error && <p className="text-[13px] text-destructive">{error}</p>}
      <Button type="submit" className="h-9 w-full" disabled={loading}>
        {loading ? "กำลังบันทึก..." : "ตั้งรหัสผ่านใหม่"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-svh items-center justify-center px-6 py-12">
      <div className="w-full max-w-[320px] animate-fade-up">
        <p className="text-[11px] text-muted-foreground">SPGPS</p>
        <h1 className="mt-1 text-[15px] font-semibold tracking-tight">
          ตั้งรหัสผ่านใหม่
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร
        </p>
        <Suspense
          fallback={
            <p className="mt-6 text-[13px] text-muted-foreground">กำลังโหลด...</p>
          }
        >
          <ResetPasswordForm />
        </Suspense>
        <p className="mt-6 text-[13px]">
          <Link
            href="/login"
            className="text-foreground underline-offset-4 hover:underline"
          >
            กลับไปเข้าสู่ระบบ
          </Link>
        </p>
      </div>
    </div>
  );
}
