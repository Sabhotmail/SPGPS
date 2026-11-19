"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  Pencil,
  Plus,
  Search,
  Shield,
  UserRound,
  UserX,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type User = {
  id: string;
  email: string;
  role: "ADMIN" | "VIEWER";
  isActive: boolean;
  groups: { id: string; name: string }[];
};

type Group = { id: string; name: string };

type EditForm = {
  email: string;
  password: string;
  role: "ADMIN" | "VIEWER";
  groupIds: string[];
};

function emptyEditForm(): EditForm {
  return { email: "", password: "", role: "VIEWER", groupIds: [] };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "VIEWER">("VIEWER");
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(emptyEditForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "ADMIN" | "VIEWER">(
    "all"
  );
  const [statusFilter, setStatusFilter] = useState<"all" | "on" | "off">("all");

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

  function openEdit(user: User) {
    setEditingUser(user);
    setEditForm({
      email: user.email,
      password: "",
      role: user.role,
      groupIds: user.groups.map((g) => g.id),
    });
    setMessage("");
  }

  function closeEdit() {
    setEditingUser(null);
    setEditForm(emptyEditForm());
  }

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
      const data = await res.json().catch(() => ({}));
      setMessage(
        typeof data.error === "string" ? data.error : "เกิดข้อผิดพลาด"
      );
    }
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editingUser) return;

    setSaving(true);
    setMessage("");
    try {
      const body: Record<string, unknown> = {
        email: editForm.email,
        role: editForm.role,
        groupIds: editForm.role === "VIEWER" ? editForm.groupIds : [],
      };
      if (editForm.password.trim()) {
        body.password = editForm.password;
      }

      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setMessage("บันทึกผู้ใช้แล้ว");
        closeEdit();
        load();
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage(
          typeof data.error === "string" ? data.error : "บันทึกไม่สำเร็จ"
        );
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user: User) {
    if (!confirm(`ลบผู้ใช้ ${user.email}?`)) return;

    setMessage("");
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      if (editingUser?.id === user.id) closeEdit();
      setMessage("ลบผู้ใช้แล้ว");
      load();
    } else {
      setMessage(
        typeof data.error === "string" ? data.error : "ลบผู้ใช้ไม่สำเร็จ"
      );
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

  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const viewerCount = users.filter((u) => u.role === "VIEWER").length;
  const inactiveCount = users.filter((u) => !u.isActive).length;

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter === "on" && !u.isActive) return false;
      if (statusFilter === "off" && u.isActive) return false;
      if (!q) return true;
      return (
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.groups.some((g) => g.name.toLowerCase().includes(q))
      );
    });
  }, [users, search, roleFilter, statusFilter]);

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Access control"
        title="ผู้ใช้"
        description="สร้างบัญชีและกำหนด role กับกลุ่มที่ Viewer เข้าถึงได้"
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            บัญชีทั้งหมด
          </p>
          <p className="mt-2 flex items-center gap-2 font-brand text-2xl font-semibold tabular-nums">
            <UserRound className="size-5 text-primary" />
            {users.length}
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Admin
          </p>
          <p className="mt-2 flex items-center gap-2 font-brand text-2xl font-semibold tabular-nums">
            <Shield className="size-5 text-primary" />
            {adminCount}
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Viewer
          </p>
          <p className="mt-2 font-brand text-2xl font-semibold tabular-nums">
            {viewerCount}
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            ปิดใช้งาน
          </p>
          <p className="mt-2 flex items-center gap-2 font-brand text-2xl font-semibold tabular-nums">
            <UserX className="size-5 text-muted-foreground" />
            {inactiveCount}
          </p>
        </div>
      </div>

      {message && !editingUser && (
        <div className="mb-5 rounded-2xl border border-primary/20 bg-primary/8 px-4 py-3 text-[13px] text-foreground">
          {message}
        </div>
      )}

      <section className="mb-8 rounded-[1.35rem] border border-border/60 bg-card/80 p-4 shadow-[0_16px_40px_-24px_rgba(15,23,42,0.35)] sm:mb-10 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              Create
            </p>
            <h2 className="mt-1 font-brand text-lg font-semibold tracking-tight">
              สร้างผู้ใช้ใหม่
            </h2>
          </div>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Plus className="size-4" />
          </div>
        </div>

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
                className="h-10 rounded-xl"
                placeholder="user@company.com"
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
                className="h-10 rounded-xl"
                placeholder="อย่างน้อย 6 ตัวอักษร"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Role</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as "ADMIN" | "VIEWER")}
              >
                <SelectTrigger className="h-10 w-full rounded-xl text-[13px]">
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
              <div className="flex flex-wrap gap-1.5 rounded-2xl border border-border/50 bg-muted/30 p-3">
                {groups.map((g) => {
                  const checked = groupIds.includes(g.id);
                  return (
                    <Button
                      key={g.id}
                      type="button"
                      size="sm"
                      variant="outline"
                      className={cn(
                        "h-8 cursor-pointer rounded-xl text-[12px]",
                        checked
                          ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                          : "bg-card/80"
                      )}
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

          <Button type="submit" className="h-10 cursor-pointer rounded-xl px-5">
            สร้างผู้ใช้
          </Button>
        </form>
      </section>

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--scrim)] p-0 sm:items-center sm:p-4">
          <div
            className="max-h-[min(92dvh,720px)] w-full max-w-lg overflow-y-auto rounded-t-[1.35rem] border border-border/70 bg-card p-5 shadow-[0_24px_64px_-24px_rgba(15,23,42,0.55)] sm:rounded-[1.35rem] sm:p-6"
            style={{
              paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
            }}
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                  Edit
                </p>
                <h2 className="mt-1 font-brand text-lg font-semibold tracking-tight">
                  แก้ไขผู้ใช้
                </h2>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {editingUser.email}
                </p>
              </div>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Pencil className="size-4" />
              </div>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-email" className="text-[13px]">
                  อีเมล
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, email: e.target.value }))
                  }
                  required
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-password" className="text-[13px]">
                  รหัสผ่านใหม่
                </Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={editForm.password}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, password: e.target.value }))
                  }
                  minLength={6}
                  placeholder="เว้นว่างถ้าไม่เปลี่ยน"
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px]">Role</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(v) =>
                    setEditForm((f) => ({
                      ...f,
                      role: v as "ADMIN" | "VIEWER",
                      groupIds: v === "ADMIN" ? [] : f.groupIds,
                    }))
                  }
                >
                  <SelectTrigger className="h-10 w-full rounded-xl text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIEWER">Viewer</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editForm.role === "VIEWER" && groups.length > 0 && (
                <div>
                  <Label className="mb-2 block text-[13px]">
                    กลุ่มที่เข้าถึงได้
                  </Label>
                  <div className="flex flex-wrap gap-1.5 rounded-2xl border border-border/50 bg-muted/30 p-3">
                    {groups.map((g) => {
                      const checked = editForm.groupIds.includes(g.id);
                      return (
                        <Button
                          key={g.id}
                          type="button"
                          size="sm"
                          variant="outline"
                          className={cn(
                            "h-8 cursor-pointer rounded-xl text-[12px]",
                            checked
                              ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                              : "bg-card/80"
                          )}
                          onClick={() =>
                            setEditForm((f) => ({
                              ...f,
                              groupIds: checked
                                ? f.groupIds.filter((id) => id !== g.id)
                                : [...f.groupIds, g.id],
                            }))
                          }
                        >
                          {g.name}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {message && editingUser && (
                <p className="rounded-xl border border-primary/20 bg-primary/8 px-3 py-2 text-[13px]">
                  {message}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 cursor-pointer rounded-xl"
                  onClick={closeEdit}
                  disabled={saving}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  className="h-10 cursor-pointer rounded-xl px-5"
                  disabled={saving}
                >
                  {saving ? "กำลังบันทึก..." : "บันทึก"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            Directory
          </p>
          <h2 className="mt-1 font-brand text-[1.15rem] font-semibold tracking-tight">
            บัญชีทั้งหมด
          </h2>
        </div>
        <div className="flex w-full flex-col gap-2">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาอีเมลหรือกลุ่ม"
              className="h-10 rounded-xl pl-9"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <div className="flex w-full rounded-xl border border-border/60 bg-card/80 p-1 sm:w-auto">
              {(
                [
                  ["all", "ทั้งหมด"],
                  ["ADMIN", "Admin"],
                  ["VIEWER", "Viewer"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    "h-8 flex-1 cursor-pointer rounded-lg px-3 text-[12px] font-medium transition-colors sm:flex-none",
                    roleFilter === value
                      ? "bg-primary/12 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setRoleFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex w-full rounded-xl border border-border/60 bg-card/80 p-1 sm:w-auto">
              {(
                [
                  ["all", "ทุกสถานะ"],
                  ["on", "Active"],
                  ["off", "Inactive"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    "h-8 flex-1 cursor-pointer rounded-lg px-3 text-[12px] font-medium transition-colors sm:flex-none",
                    statusFilter === value
                      ? "bg-primary/12 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setStatusFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="rounded-[1.35rem] border border-dashed border-border/70 bg-card/40 px-5 py-12 text-center text-[13px] text-muted-foreground">
          {users.length === 0
            ? "ยังไม่มีผู้ใช้ — สร้างบัญชีแรกด้านบน"
            : "ไม่พบบัญชีตามตัวกรอง"}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filteredUsers.map((u) => (
            <section
              key={u.id}
              className="rounded-[1.35rem] border border-border/60 bg-card/80 p-5 shadow-[0_12px_32px_-20px_rgba(15,23,42,0.3)]"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-brand text-[1.05rem] font-semibold tracking-tight">
                      {u.email}
                    </h3>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-md",
                        u.role === "ADMIN"
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : ""
                      )}
                    >
                      {u.role}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-md",
                        u.isActive
                          ? "border-status-online/30 bg-status-online/10 text-status-online"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {u.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  กลุ่มที่เข้าถึง
                </p>
                {u.role === "ADMIN" ? (
                  <p className="rounded-2xl bg-muted/40 px-3 py-3 text-[13px] text-muted-foreground">
                    เข้าถึงทุกกลุ่ม
                  </p>
                ) : groups.length === 0 ? (
                  <p className="rounded-2xl bg-muted/40 px-3 py-3 text-[13px] text-muted-foreground">
                    ยังไม่มีกลุ่มในระบบ
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {groups.map((g) => {
                      const active = u.groups.some((x) => x.id === g.id);
                      return (
                        <Button
                          key={g.id}
                          type="button"
                          size="sm"
                          variant="outline"
                          className={cn(
                            "h-8 cursor-pointer rounded-xl text-[12px]",
                            active
                              ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                              : "bg-card/80"
                          )}
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
              </div>

              <div className="flex flex-wrap gap-1.5 border-t border-border/50 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 cursor-pointer rounded-xl text-[12px]"
                  onClick={() => openEdit(u)}
                >
                  <Pencil className="mr-1.5 size-3.5" />
                  แก้ไข
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 cursor-pointer rounded-xl text-[12px]"
                  disabled={!u.isActive}
                  onClick={() => sendResetLink(u)}
                >
                  <KeyRound className="mr-1.5 size-3.5" />
                  ส่งลิงก์รีเซ็ต
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 cursor-pointer rounded-xl text-[12px]"
                  onClick={() => toggleActive(u)}
                >
                  {u.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 cursor-pointer rounded-xl text-[12px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleDelete(u)}
                >
                  ลบ
                </Button>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
