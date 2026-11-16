import fs from "node:fs";
import path from "node:path";
const check = process.argv.includes("--check");
let stale = false;
for (const id of fs.readdirSync("testsets")) {
  const dir = path.join("testsets", id);
  if (!fs.statSync(dir).isDirectory()) continue;
  const set = JSON.parse(fs.readFileSync(path.join(dir, "testset.json")));
  let text = `# ${set.title}\n\n${set.description}\n\n本文件由 \`npm run catalog\` 生成，修改命令请编辑同目录 JSONL，不手工维护此目录。\n`;
  for (const file of set.files) {
    const cases = fs
      .readFileSync(path.join(dir, file), "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((x) => JSON.parse(x));
    text += `\n## ${file} · ${cases.length} 条\n`;
    for (const c of cases) {
      const fence = "`".repeat(
        Math.max(
          3,
          ...[...c.command.matchAll(/`+/g)].map((m) => m[0].length + 1),
        ),
      );
      text += `\n### ${c.id}\n\n${c.platforms.join(" / ")} · ${c.dialect} · ${c.profile} · 预期 ${c.expect.syntax}\n\n${fence}text\n${c.command}\n${fence}\n`;
      if (c.expect.containsArgv?.length) text += `\n精确命令参数预期：\`${JSON.stringify(c.expect.containsArgv)}\`\n`;
      if (c.expect.policyByLevel) {
        text += "\n| 权限档位 | 预期决定 |\n| --- | --- |\n";
        for (const level of ["ask_for_approval", "auto_approve", "full_access"])
          text += `| ${level} | ${c.expect.policyByLevel[level]?.decision ?? "缺少预期"} |\n`;
        text += `\n预期依据：${c.expect.policyBasis}\n`;
      }
    }
  }
  for (const ref of set.references ?? [])
    text += `\n引用 [${ref.testsetId}](../${ref.testsetId}/COMMANDS.md)：\n\n${ref.caseIds.map((x) => "- " + x).join("\n")}\n`;
  const out = path.join(dir, "COMMANDS.md");
  if (check) {
    if (!fs.existsSync(out) || fs.readFileSync(out, "utf8") !== text) {
      console.error("Catalog stale:", out);
      stale = true;
    }
  } else fs.writeFileSync(out, text);
}
if (stale) process.exitCode = 1;
