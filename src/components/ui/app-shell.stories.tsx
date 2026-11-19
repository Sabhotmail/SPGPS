import type { Meta, StoryObj } from "@storybook/react";
import { StatusDot } from "./status-dot";
import { Badge } from "./badge";
import { EmptyState } from "./empty-state";

function ShellChromePreview() {
  return (
    <div className="w-[360px] overflow-hidden rounded-xl border border-border bg-sidebar p-4 text-sidebar-foreground shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="brand-mark" aria-hidden />
        <span className="font-semibold tracking-tight">SPGPS</span>
      </div>
      <p className="mb-3 text-[10px] font-medium tracking-[0.16em] text-muted-foreground">
        OPS CONSOLE
      </p>
      <div className="space-y-2 text-sm">
        <div className="relative rounded-md bg-accent/40 px-3 py-2 font-medium">
          <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary" />
          ตำแหน่ง
        </div>
        <div className="rounded-md px-3 py-2 text-muted-foreground">ประวัติ</div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <StatusDot status="online" showLabel />
        <Badge variant="outline">ADMIN</Badge>
      </div>
      <div className="mt-4 rounded-lg border border-border/80 bg-card">
        <EmptyState title="ยังไม่มีอุปกรณ์" description="ซิงก์จาก Scalefusion เพื่อเริ่มติดตาม" />
      </div>
    </div>
  );
}

const meta: Meta<typeof ShellChromePreview> = {
  title: "Shell/ChromePreview",
  component: ShellChromePreview,
};

export default meta;
type Story = StoryObj<typeof ShellChromePreview>;

export const Default: Story = {};
