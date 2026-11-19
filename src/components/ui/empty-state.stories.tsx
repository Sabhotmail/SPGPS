import type { Meta, StoryObj } from "@storybook/react";
import { EmptyState } from "./empty-state";

const meta: Meta<typeof EmptyState> = {
  title: "UI/EmptyState",
  component: EmptyState,
  args: {
    title: "ยังไม่มีอุปกรณ์",
    description: "ซิงก์จาก Scalefusion หรือเพิ่มกลุ่มเพื่อเริ่มติดตาม",
  },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {};
