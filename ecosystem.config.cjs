const fs = require("fs");
const path = require("path");

const root = __dirname;

function readPortFromEnvFile() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return "3000";
  const match = fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /^PORT\s*=/.test(line));
  if (!match) return "3000";
  const [, value] = match.split("=", 2);
  return (value ?? "3000").trim().replace(/^["']|["']$/g, "") || "3000";
}

const port = readPortFromEnvFile();

const shared = {
  exec_mode: "fork",
  windowsHide: true,
  vizion: false,
  merge_logs: true,
  log_date_format: "YYYY-MM-DD HH:mm:ss",
  autorestart: true,
  max_restarts: 10,
  restart_delay: 5000,
  watch: false,
  env: {
    NODE_ENV: "production",
  },
};

/** @type {import('pm2').StartOptions[]} */
const apps = [
  {
    ...shared,
    name: "spgps-web",
    cwd: root,
    script: path.join(root, "node_modules/next/dist/bin/next"),
    args: `start -H 0.0.0.0 -p ${port}`,
    interpreter: "node",
    error_file: path.join(root, "logs/web.err.log"),
    out_file: path.join(root, "logs/web.out.log"),
  },
  {
    ...shared,
    name: "spgps-worker",
    cwd: root,
    script: path.join(root, "scripts/run-worker.cjs"),
    interpreter: "node",
    error_file: path.join(root, "logs/worker.err.log"),
    out_file: path.join(root, "logs/worker.out.log"),
  },
];

module.exports = { apps };
