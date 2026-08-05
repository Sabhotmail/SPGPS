"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type User = {
  id: string;
  email: string;
  role: "ADMIN" | "VIEWER";
  isActive: boolean;
  groups: { id: string; name: string }[];
};

type Group = { id: string; name: string };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "VIEWER">("VIEWER");
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const [usersRes, groupsRes] = await Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/admin/groups"),
    ]);
    if (usersRes.ok) {
      const data = await usersRes.json();
      setUsers(data.users ?? []);
    }
    if (groupsRes.ok) {
      const data = await groupsRes.json();
      setGroups(
        (data.groups ?? []).map((g: Group & { devices?: unknown[] }) => ({
          id: g.id,
          name: g.name,
        }))
      );
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role, groupIds }),
    });
    if (res.ok) {
      setEmail("");
      setPassword("");
      setGroupIds([]);
      setMessage("สร้างผู้ใช้แล้ว");
      load();
    } else {
      const data = await res.json();
      setMessage(typeof data.error === "string" ? data.error : "เกิดข้อผิดพลาด");
    }
  }

  async function toggleActive(user: User) {
    await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    load();
  }

  async function updateUserGroups(userId: string, newGroupIds: string[]) {
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupIds: newGroupIds }),
    });
    load();
  }

  async function sendResetLink(user: User) {
    setMessage("");
    const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMessage(
        typeof data.message === "string"
          ? data.message
          : `ส่งลิงก์รีเซ็ตไปที่ ${user.email} แล้ว`
      );
    } else {
      setMessage(
        typeof data.error === "string" ? data.error : "ส่งลิงก์รีเซ็ตไม่สำเร็จ"
      );
    }
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="ผู้ใช้"
        description="สร้างบัญชีและกำหนด role กับกลุ่มที่ Viewer เข้าถึงได้"
        meta={
          <span className="text-[13px] tabular-nums text-muted-foreground">
            {users.length} บัญชี
          </span>
        }
      />

      <section className="form-section mb-10">
        <h2 className="mb-4 text-[15px] font-semibold">สร้างผู้ใช้</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-email" className="text-[13px]">
                อีเมล
              </Label>
              <Input
                id="new-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-[13px]">
                รหัสผ่าน
              </Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Role</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as "ADMIN" | "VIEWER")}
              >
                <SelectTrigger className="h-9 w-full text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIEWER">Viewer</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {role === "VIEWER" && groups.length > 0 && (
            <div>
              <Label className="mb-2 block text-[13px]">กลุ่มที่เข้าถึงได้</Label>
              <div className="flex flex-wrap gap-1.5">
                {groups.map((g) => {
                  const checked = groupIds.includes(g.id);
                  return (
                    <Button
                      key={g.id}
                      type="button"
                      size="sm"
                      variant={checked ? "default" : "outline"}
                      className="h-7 text-[12px]"
                      onClick={() =>
                        setGroupIds((prev) =>
                          checked
                            ? prev.filter((id) => id !== g.id)
                            : [...prev, g.id]
                        )
                      }
                    >
                      {g.name}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" className="h-9">
              สร้างผู้ใช้
            </Button>
            {message && (
              <p className="text-[13px] text-muted-foreground">{message}</p>
            )}
          </div>
        </form>
      </section>

      <div className="overflow-x-auto border">
        <table className="workspace-table">
          <thead>
            <tr>
              <th>อีเมล</th>
              <th>Role</th>
              <th>กลุ่ม</th>
              <th>สถานะ</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="text-[13px] font-medium">{u.email}</td>
                <td className="text-[13px]">{u.role}</td>
                <td>
                  {u.role === "ADMIN" ? (
                    <span className="text-[13px] text-muted-foreground">
                      ทั้งหมด
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {groups.map((g) => {
                        const active = u.groups.some((x) => x.id === g.id);
                        return (
                          <Button
                            key={g.id}
                            type="button"
                            size="xs"
                            variant={active ? "default" : "outline"}
                            className="h-6 text-[11px]"
                            onClick={() => {
                              const next = active
                                ? u.groups
                                    .filter((x) => x.id !== g.id)
                                    .map((x) => x.id)
                                : [...u.groups.map((x) => x.id), g.id];
                              updateUserGroups(u.id, next);
                            }}
                          >
                            {g.name}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </td>
                <td className="text-[13px]">
                  {u.isActive ? "Active" : "Inactive"}
                </td>
                <td className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[12px]"
                      disabled={!u.isActive}
                      onClick={() => sendResetLink(u)}
                    >
                      ส่งลิงก์รีเซ็ต
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[12px]"
                      onClick={() => toggleActive(u)}
                    >
                      {u.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
