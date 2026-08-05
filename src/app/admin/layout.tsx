import { auth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== Role.ADMIN) redirect("/map");

  return (
    <AppShell role={session.user.role} email={session.user.email}>
      {children}
    </AppShell>
  );
}
