import { hashPassword } from "../src/lib/auth";
import { prisma } from "../src/lib/db";
import { Role } from "@prisma/client";

async function main() {
  const email = (
    process.env.SEED_ADMIN_EMAIL ?? "admin@spgps.local"
  ).toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "admin123";

  const passwordHash = await hashPassword(password);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Keep local/e2e credentials in sync with SEED_ADMIN_PASSWORD
    await prisma.user.update({
      where: { email },
      data: { passwordHash, role: Role.ADMIN },
    });
    console.log(`Admin user updated: ${email}`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: Role.ADMIN,
    },
  });

  console.log(`Created admin user: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
