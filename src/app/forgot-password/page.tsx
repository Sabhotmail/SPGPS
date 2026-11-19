"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { AuthFrame } from "@/components/AuthFrame";
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
    <AuthFrame
      eyebrow="Recovery"
      title="ลืมรหัสผ่าน"
      description="กรอกอีเมลที่ใช้เข้าสู่ระบบ ระบบจะส่งลิงก์ตั้งรหัสใหม่ (ใช้ได้ 1 ชั่วโมง)"
    >
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
        {message && (
          <p
            className="rounded-xl border border-primary/20 bg-primary/8 px-3.5 py-2.5 text-[13px] text-foreground"
            role="status"
          >
            {message}
          </p>
        )}
        <Button
          type="submit"
          className="h-11 w-full cursor-pointer rounded-xl text-[15px] font-semibold"
          disabled={loading}
        >
          {loading ? "กำลังส่ง..." : "ส่งลิงก์รีเซ็ต"}
        </Button>
      </form>

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
