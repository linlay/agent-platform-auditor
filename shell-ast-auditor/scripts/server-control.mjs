import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fs.realpathSync(
  path.dirname(path.dirname(fileURLToPath(import.meta.url))),
);
const address = process.env.AUDITOR_ADDR ?? "127.0.0.1:8093";
const url = "http://" + address + "/api/health";
const action = process.argv[2] ?? "status";
if (!["status", "stop"].includes(action))
  throw Error("usage: server-control.mjs status|stop");
let health;
try {
  const r = await fetch(url, { signal: AbortSignal.timeout(1500) });
  if (!r.ok) throw Error("health check failed");
  health = await r.json();
} catch (e) {
  if (e.cause?.code === "ECONNREFUSED") {
    console.log("Service is not running at " + address);
    process.exit(0);
  }
  throw e;
}
if (
  health.app !== "shell-ast-auditor" ||
  health.projectRoot !== root ||
  !Number.isSafeInteger(health.pid) ||
  health.pid <= 1
)
  throw Error(
    "Listener is not this project; refusing to signal another service.",
  );
if (action === "status") {
  console.log(JSON.stringify(health, null, 2));
  process.exit(0);
}
process.kill(health.pid, "SIGTERM");
for (let i = 0; i < 50; i++) {
  await new Promise((r) => setTimeout(r, 100));
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(300) });
    const h = await r.json();
    if (h.pid !== health.pid) {
      console.log(
        "Stopped previous service " +
          health.pid +
          "; a different process is now listening.",
      );
      process.exit(0);
    }
  } catch {
    console.log("Stopped shell-ast-auditor pid " + health.pid);
    process.exit(0);
  }
}
throw Error(
  "Service did not stop within 5 seconds; no force-kill was attempted.",
);
