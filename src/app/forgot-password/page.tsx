"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      setMessage(
        typeof data.message === "string"
          ? data.message
          : "ถ้าอีเมลนี้มีในระบบ คุณจะได้รับลิงก์รีเซ็ตรหัสผ่านในไม่ช้า"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center px-6 py-12">
      <div className="w-full max-w-[320px] animate-fade-up">
        <p className="text-[11px] text-muted-foreground">SPGPS</p>
        <h1 className="mt-1 text-[15px] font-semibold tracking-tight">
          ลืมรหัสผ่าน
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          กรอกอีเมลที่ใช้เข้าสู่ระบบ ระบบจะส่งลิงก์ตั้งรหัสใหม่ (ใช้ได้ 1
          ชั่วโมง)
        </p>

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
          {message && (
            <p className="text-[13px] text-muted-foreground">{message}</p>
          )}
          <Button type="submit" className="h-9 w-full" disabled={loading}>
            {loading ? "กำลังส่ง..." : "ส่งลิงก์รีเซ็ต"}
          </Button>
        </form>

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
