import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const binDir = join(process.cwd(), "bin");
mkdirSync(binDir, { recursive: true });

const output = join(
  binDir,
  process.platform === "win32" ? "catalog-lock-auditor.exe" : "catalog-lock-auditor",
);

const result = spawnSync("go", ["build", "-o", output, "./cmd/server"], {
  stdio: "inherit",
});

if (result.error) {
  console.error(`Failed to build server binary: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
