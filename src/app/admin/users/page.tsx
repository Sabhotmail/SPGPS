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
          </div>
        </form>
      </section>

      {message && !editingUser && (
        <p className="mb-4 text-[13px] text-muted-foreground">{message}</p>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4">
          <div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg">
            <h2 className="text-[15px] font-semibold">แก้ไขผู้ใช้</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {editingUser.email}
            </p>

            <form onSubmit={handleUpdate} className="mt-4 space-y-4">
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
                  className="h-9"
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
                  className="h-9"
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
                  <SelectTrigger className="h-9 w-full text-[13px]">
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
                  <div className="flex flex-wrap gap-1.5">
                    {groups.map((g) => {
                      const checked = editForm.groupIds.includes(g.id);
                      return (
                        <Button
                          key={g.id}
                          type="button"
                          size="sm"
                          variant={checked ? "default" : "outline"}
                          className="h-7 text-[12px]"
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
                <p className="text-[13px] text-muted-foreground">{message}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9"
                  onClick={closeEdit}
                  disabled={saving}
                >
                  ยกเลิก
                </Button>
                <Button type="submit" className="h-9" disabled={saving}>
                  {saving ? "กำลังบันทึก..." : "บันทึก"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  <div className="flex flex-wrap justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[12px]"
                      onClick={() => openEdit(u)}
                    >
                      แก้ไข
                    </Button>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[12px] text-destructive hover:text-destructive"
                      onClick={() => handleDelete(u)}
                    >
                      ลบ
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
