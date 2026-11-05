/**
 * Windows-safe `prisma generate`.
 * EPERM on renaming query_engine-windows.dll.node usually means another
 * Node/Next process still has the engine loaded — stop it, then retry.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const engine = path.join(
  root,
  "node_modules",
  ".prisma",
  "client",
  "query_engine-windows.dll.node"
);

function runGenerate() {
  const result = spawnSync("npx", ["prisma", "generate"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  return result.status ?? 1;
}

function tryUnlockEngine() {
  if (process.platform !== "win32") return false;
  try {
    if (fs.existsSync(engine)) {
      fs.unlinkSync(engine);
      console.warn(
        "[prisma-generate-safe] Removed locked query_engine-windows.dll.node; retrying…"
      );
      return true;
    }
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? err.code : "";
    if (code === "EPERM" || code === "EBUSY") {
      console.error(`
[prisma-generate-safe] Cannot update Prisma engine — file is locked:

  ${engine}

Stop anything using this app folder, then rebuild:

  1) Stop \`npm run dev\` / \`npm start\` / PM2 / NSSM for SPGPS
  2) Optional: taskkill /F /IM node.exe   (closes ALL Node processes)
  3) npm run build
`);
      return false;
    }
    throw err;
  }
  return false;
}

let code = runGenerate();
if (code !== 0 && process.platform === "win32") {
  if (tryUnlockEngine()) {
    code = runGenerate();
  }
}
process.exit(code);
