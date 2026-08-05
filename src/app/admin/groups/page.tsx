"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="กลุ่มพนักงาน"
        description="จัดอุปกรณ์เป็นกลุ่มเพื่อกำหนดสิทธิ์ Viewer"
        meta={
          <span className="text-[13px] tabular-nums text-muted-foreground">
            {groups.length} กลุ่ม
          </span>
        }
      />

      <section className="form-section mb-10">
        <h2 className="mb-4 text-[15px] font-semibold">สร้างกลุ่ม</h2>
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
                className="h-9"
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
                className="h-9"
              />
            </div>
          </div>

          {allDevices.length > 0 && (
            <div>
              <Label className="mb-2 block text-[13px]">อุปกรณ์ในกลุ่ม</Label>
              <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                {allDevices.map((d) => {
                  const checked = deviceIds.includes(d.id);
                  return (
                    <Button
                      key={d.id}
                      type="button"
                      size="sm"
                      variant={checked ? "default" : "outline"}
                      className="h-7 text-[12px]"
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
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" className="h-9">
              สร้างกลุ่ม
            </Button>
            {message && (
              <p className="text-[13px] text-muted-foreground">{message}</p>
            )}
          </div>
        </form>
      </section>

      {groups.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">ยังไม่มีกลุ่ม</p>
      ) : (
        <div className="divide-y border-t">
          {groups.map((g) => {
            const inGroupIds = new Set(g.devices.map((d) => d.id));
            const available = allDevices.filter((d) => !inGroupIds.has(d.id));

            return (
              <section key={g.id} className="py-6">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-[15px] font-semibold">{g.name}</h3>
                    {g.description && (
                      <p className="mt-1 text-[13px] text-muted-foreground">
                        {g.description}
                      </p>
                    )}
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      {g.devices.length} อุปกรณ์
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[12px] text-destructive hover:text-destructive"
                    onClick={() => handleDelete(g.id)}
                  >
                    ลบ
                  </Button>
                </div>

                {g.devices.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">
                    ยังไม่มีอุปกรณ์ในกลุ่ม
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {g.devices.map((d) => (
                      <Button
                        key={d.id}
                        type="button"
                        size="sm"
                        variant="default"
                        className="h-7 text-[12px]"
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
                  <details className="mt-4">
                    <summary className="cursor-pointer text-[13px] text-muted-foreground hover:text-foreground">
                      เพิ่มอุปกรณ์ ({available.length})
                    </summary>
                    <div className="mt-2 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                      {available.map((d) => (
                        <Button
                          key={d.id}
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-[12px]"
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
