import { spawnSync } from "node:child_process";

const result = spawnSync("go", ["run", "./cmd/build-targets", ...process.argv.slice(2)], {
  stdio: "inherit",
});

if (result.error) {
  console.error(`Failed to invoke build-targets: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
