import { Role } from "@prisma/client";
import { readFileSync } from "fs";
import { prisma } from "../src/lib/db";

const KEEP = new Set([
  "wisith.sae@siripro.co.th",
  "toryos.yut@siripro.co.th",
  "supat.pet@siripro.co.th",
  "wanchareom.the@siripro.co.th",
]);

async function main() {
  const path =
    process.env.USERS_JSON ??
    "c:/Users/IT-THANUPHAT-NB/.cursor/projects/d-WorkingVSCode-SPGPS/attachments/64a1d6fd-09b3-4d40-9c86-effd31f1e7f0/users_202611191000.json";

  const raw = JSON.parse(readFileSync(path, "utf8")) as {
    users: { email: string; password: string; status: string }[];
  };

  const selected = raw.users.filter(
    (u) => KEEP.has(u.email.toLowerCase()) && u.status === "Active"
  );

  if (selected.length === 0) {
    throw new Error("No matching users found in JSON");
  }

  for (const u of selected) {
    const email = u.email.toLowerCase();
    // bcryptjs accepts $2a$/$2b$; PHP dumps often use $2y$
    const passwordHash = u.password.replace(/^\$2y\$/, "$2a$");
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      await prisma.user.update({
        where: { email },
        data: { passwordHash, role: Role.VIEWER, isActive: true },
      });
      console.log(`updated ${email}`);
    } else {
      await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: Role.VIEWER,
          isActive: true,
        },
      });
      console.log(`created ${email}`);
    }
  }

  const listed = await prisma.user.findMany({
    where: { email: { in: [...KEEP] } },
    orderBy: { email: "asc" },
    select: { email: true, role: true, isActive: true },
  });
  console.log(JSON.stringify(listed, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
