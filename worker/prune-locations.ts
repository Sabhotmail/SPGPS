/**
 * Delete old location_records (and matching day stats).
 *
 * Usage:
 *   npm run worker:prune -- --days=365
 *   LOCATION_RETENTION_DAYS=365 npm run worker:prune
 *
 * Dry run:
 *   npm run worker:prune -- --days=365 --dry-run
 */
import { prisma } from "../src/lib/db";
import { pruneLocationRecordsOlderThan } from "../src/lib/location-maintenance";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

async function main() {
  const days = Number(
    arg("days") ?? process.env.LOCATION_RETENTION_DAYS ?? ""
  );
  const dryRun = process.argv.includes("--dry-run");

  if (!Number.isFinite(days) || days < 30) {
    console.error(
      "Set retention days (>= 30): --days=365 or LOCATION_RETENTION_DAYS=365"
    );
    process.exit(1);
  }

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  console.log(
    `Prune location_records older than ${cutoff.toISOString()} (${days} days)${dryRun ? " [dry-run]" : ""}`
  );

  if (dryRun) {
    const count = await prisma.locationRecord.count({
      where: { recordedAt: { lt: cutoff } },
    });
    console.log(`Would delete ~${count} rows`);
    return;
  }

  const { deleted } = await pruneLocationRecordsOlderThan(cutoff, {
    onProgress: (n) => console.log(`Deleted ${n}…`),
  });
  console.log(`Done. Deleted ${deleted} location rows.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
