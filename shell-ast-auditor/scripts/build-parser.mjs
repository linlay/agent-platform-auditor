import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const python = process.platform === "win32" ? "python" : "python3";
const script = fileURLToPath(new URL("./build-parser.py", import.meta.url));
const result = spawnSync(python, [script], { stdio: "inherit" });
if (result.error) {
  console.error(`Could not run ${python}: ${result.error.message}`);
}
process.exitCode = result.status ?? 1;
