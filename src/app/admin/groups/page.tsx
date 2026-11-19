"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { FolderKanban, Plus, Search, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Group = {
  id: string;
  name: string;
  description: string | null;
  devices: { id: string; deviceName: string; employeeName: string | null }[];
};

type Device = {
  id: string;
  deviceName: string;
  employeeName: string | null;
};

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deviceIds, setDeviceIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [createDeviceSearch, setCreateDeviceSearch] = useState("");

  async function load() {
    const [groupsRes, devicesRes] = await Promise.all([
      fetch("/api/admin/groups"),
      fetch("/api/admin/devices"),
    ]);
    if (groupsRes.ok) {
      const data = await groupsRes.json();
      setGroups(data.groups ?? []);
    }
    if (devicesRes.ok) {
      const data = await devicesRes.json();
      setAllDevices(data.devices ?? []);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    const res = await fetch("/api/admin/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, deviceIds }),
    });
    if (res.ok) {
      setName("");
      setDescription("");
      setDeviceIds([]);
      setCreateDeviceSearch("");
      setMessage("สร้างกลุ่มแล้ว");
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage(
        typeof data.error === "string" ? data.error : "เกิดข้อผิดพลาด"
      );
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("ลบกลุ่มนี้?")) return;
    await fetch(`/api/admin/groups/${id}`, { method: "DELETE" });
    load();
  }

  async function updateGroupDevices(groupId: string, newDeviceIds: string[]) {
    await fetch(`/api/admin/groups/${groupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceIds: newDeviceIds }),
    });
    load();
  }

  const totalMembers = groups.reduce((sum, g) => sum + g.devices.length, 0);
  const emptyGroups = groups.filter((g) => g.devices.length === 0).length;

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.description ?? "").toLowerCase().includes(q) ||
        g.devices.some(
          (d) =>
            d.deviceName.toLowerCase().includes(q) ||
            (d.employeeName ?? "").toLowerCase().includes(q)
        )
    );
  }, [groups, search]);

  const createDeviceOptions = useMemo(() => {
    const q = createDeviceSearch.trim().toLowerCase();
    if (!q) return allDevices;
    return allDevices.filter(
      (d) =>
        d.deviceName.toLowerCase().includes(q) ||
        (d.employeeName ?? "").toLowerCase().includes(q)
    );
  }, [allDevices, createDeviceSearch]);

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Access control"
        title="กลุ่มพนักงาน"
        description="จัดอุปกรณ์เป็นกลุ่มเพื่อกำหนดสิทธิ์ Viewer"
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            กลุ่ม
          </p>
          <p className="mt-2 flex items-center gap-2 font-brand text-2xl font-semibold tabular-nums">
            <FolderKanban className="size-5 text-primary" />
            {groups.length}
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            สมาชิกทั้งหมด
          </p>
          <p className="mt-2 flex items-center gap-2 font-brand text-2xl font-semibold tabular-nums">
            <Users className="size-5 text-primary" />
            {totalMembers}
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            กลุ่มว่าง
          </p>
          <p className="mt-2 font-brand text-2xl font-semibold tabular-nums">
            {emptyGroups}
          </p>
        </div>
      </div>

      {message && (
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
              สร้างกลุ่มใหม่
            </h2>
          </div>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Plus className="size-4" />
          </div>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="group-name" className="text-[13px]">
                ชื่อกลุ่ม
              </Label>
              <Input
                id="group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-10 rounded-xl"
                placeholder="เช่น กรุงเทพฝั่งตะวันออก"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="group-desc" className="text-[13px]">
                คำอธิบาย
              </Label>
              <Input
                id="group-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-10 rounded-xl"
                placeholder="ไม่บังคับ"
              />
            </div>
          </div>

          {allDevices.length > 0 && (
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <Label className="text-[13px]">
                  อุปกรณ์ในกลุ่ม
                  {deviceIds.length > 0 && (
                    <span className="ml-1.5 tabular-nums text-muted-foreground">
                      ({deviceIds.length})
                    </span>
                  )}
                </Label>
                <div className="relative w-full sm:w-[220px]">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    value={createDeviceSearch}
                    onChange={(e) => setCreateDeviceSearch(e.target.value)}
                    placeholder="ค้นหาอุปกรณ์"
                    className="h-8 rounded-xl pl-8 text-[12px]"
                  />
                </div>
              </div>
              <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto rounded-2xl border border-border/50 bg-muted/30 p-3">
                {createDeviceOptions.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground">ไม่พบอุปกรณ์</p>
                ) : (
                  createDeviceOptions.map((d) => {
                    const checked = deviceIds.includes(d.id);
                    return (
                      <Button
                        key={d.id}
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
                          setDeviceIds((prev) =>
                            checked
                              ? prev.filter((id) => id !== d.id)
                              : [...prev, d.id]
                          )
                        }
                      >
                        {d.employeeName ?? d.deviceName}
                      </Button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <Button type="submit" className="h-10 cursor-pointer rounded-xl px-5">
            สร้างกลุ่ม
          </Button>
        </form>
      </section>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            Directory
          </p>
          <h2 className="mt-1 font-brand text-[1.15rem] font-semibold tracking-tight">
            กลุ่มทั้งหมด
          </h2>
        </div>
        <div className="relative w-full sm:w-[260px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหากลุ่มหรือสมาชิก"
            className="h-10 rounded-xl pl-9"
          />
        </div>
      </div>

      {filteredGroups.length === 0 ? (
        <div className="rounded-[1.35rem] border border-dashed border-border/70 bg-card/40 px-5 py-12 text-center text-[13px] text-muted-foreground">
          {groups.length === 0
            ? "ยังไม่มีกลุ่ม — สร้างกลุ่มแรกด้านบน"
            : "ไม่พบกลุ่มตามคำค้นหา"}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filteredGroups.map((g) => {
            const inGroupIds = new Set(g.devices.map((d) => d.id));
            const available = allDevices.filter((d) => !inGroupIds.has(d.id));

            return (
              <section
                key={g.id}
                className="rounded-[1.35rem] border border-border/60 bg-card/80 p-5 shadow-[0_12px_32px_-20px_rgba(15,23,42,0.3)]"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-brand text-[1.05rem] font-semibold tracking-tight">
                        {g.name}
                      </h3>
                      <Badge variant="outline" className="rounded-md tabular-nums">
                        {g.devices.length} เครื่อง
                      </Badge>
                    </div>
                    {g.description && (
                      <p className="mt-1.5 text-[13px] text-muted-foreground">
                        {g.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 shrink-0 cursor-pointer rounded-xl text-[12px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleDelete(g.id)}
                  >
                    ลบ
                  </Button>
                </div>

                {g.devices.length === 0 ? (
                  <p className="rounded-2xl bg-muted/40 px-3 py-4 text-[13px] text-muted-foreground">
                    ยังไม่มีอุปกรณ์ในกลุ่ม
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {g.devices.map((d) => (
                      <Button
                        key={d.id}
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 cursor-pointer rounded-xl border-primary/30 bg-primary/10 text-[12px] text-primary hover:bg-primary/15"
                        title="คลิกเพื่อนำออกจากกลุ่ม"
                        onClick={() => {
                          updateGroupDevices(
                            g.id,
                            g.devices
                              .filter((x) => x.id !== d.id)
                              .map((x) => x.id)
                          );
                        }}
                      >
                        {d.employeeName ?? d.deviceName}
                      </Button>
                    ))}
                  </div>
                )}

                {available.length > 0 && (
                  <details className="mt-4 group">
                    <summary className="cursor-pointer list-none text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-muted/60 px-3 py-1.5 group-open:bg-muted">
                        <Plus className="size-3.5" />
                        เพิ่มอุปกรณ์ ({available.length})
                      </span>
                    </summary>
                    <div className="mt-3 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-2xl border border-border/50 bg-muted/20 p-3">
                      {available.map((d) => (
                        <Button
                          key={d.id}
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 cursor-pointer rounded-xl bg-card/80 text-[12px]"
                          onClick={() => {
                            updateGroupDevices(g.id, [
                              ...g.devices.map((x) => x.id),
                              d.id,
                            ]);
                          }}
                        >
                          {d.employeeName ?? d.deviceName}
                        </Button>
                      ))}
                    </div>
                  </details>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
