import type { Meta, StoryObj } from "@storybook/react";
import { StatusDot } from "./status-dot";

const meta: Meta<typeof StatusDot> = {
  title: "UI/StatusDot",
  component: StatusDot,
  args: { showLabel: true },
};

export default meta;
type Story = StoryObj<typeof StatusDot>;

export const Online: Story = { args: { status: "online" } };
export const Idle: Story = { args: { status: "idle" } };
export const Offline: Story = { args: { status: "offline" } };
