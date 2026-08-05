import { auth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <AppShell role={session.user.role} email={session.user.email}>
      {children}
    </AppShell>
  );
}
