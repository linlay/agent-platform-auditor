import { assertCoreParsingRun } from "./core-parsing-check.mjs";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const base = process.env.AUDITOR_URL ?? "http://127.0.0.1:8093";
async function api(route, body) {
  const r = await fetch(base + route, body === undefined ? undefined : {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function completed(start) {
  for (let i = 0; i < 400; i++) {
    const r = await api("/api/runs/" + start.id);
    if (r.state !== "running") { assert.equal(r.state, "completed"); return r; }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("run timeout");
}
const health = await api("/api/health");
const root = health.projectRoot;
const directory = fs.realpathSync(path.dirname(root));
const command = "git -C /project status | head -20 > result.txt";
const review = { mode: "evaluation", accessLevel: "ask_for_approval", workspace: "/project", cwd: "/project", editing: true };
const request = { command, dialect: "bash", profile: "bash-3.2", projectDir: directory, review };
const parsed = await api("/api/parse", request);
assert.equal(parsed.exitCode, 0);
assert.equal(parsed.input.command, command.replace("/project", directory));
assert.equal(parsed.input.templateCommand, command);
assert.equal(parsed.input.review.workspace, directory);
assert.equal(parsed.input.review.cwd, directory);
assert.equal(parsed.report.policy.accessLevel, "ask_for_approval");
assert.ok(!(parsed.report.policy.classifications ?? []).some((c) => c.target === "/project"));

const bad = await fetch(base + "/api/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...request, projectDir: path.join(root, "missing-mapping-directory") }) });
assert.equal(bad.status, 400);
assert.match(await bad.text(), /映射目录必须是本机已存在的目录/);

const original = fs.readFileSync("testsets/shell-core/bash.jsonl", "utf8");
const batch = await completed(await api("/api/runs", { testsetId: "shell-core", kind: "batch", projectDir: directory }));
assert.equal(batch.cases.length, 317);
assert.equal(batch.counts.error ?? 0, 0);
assertCoreParsingRun(batch);
const pipeline = batch.cases.find((c) => c.id === "bash.pipeline.macos32");
assert.equal(pipeline.templateCommand, command);
assert.equal(pipeline.command, command.replace("/project", directory));
const saved = await api("/api/runs/" + batch.id + "/cases/" + pipeline.id);
assert.equal(saved.input.command, pipeline.command);
assert.equal(saved.input.projectDir, directory);
assert.equal(fs.readFileSync("testsets/shell-core/bash.jsonl", "utf8"), original);

const different = await completed(await api("/api/runs", { testsetId: "shell-core", caseIds: [pipeline.id], projectDir: root, kind: "manual" }));
const comparison = await api("/api/comparisons", { baseRunId: batch.id, targetRunId: different.id });
assert.equal(comparison.rows.find((r) => r.caseId === pipeline.id).verdict, "input-changed");

fs.mkdirSync("artifacts", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const pageErrors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 1000 } });
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  await page.goto(base);
  await page.getByRole("button", { name: "设置用例内目录", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  assert.equal(await page.getByLabel("用例 /project 映射目录", { exact: true }).inputValue(), root);
  await page.getByLabel("用例 /project 映射目录", { exact: true }).fill(directory);
  await page.screenshot({ path: "artifacts/project-mapping-dialog.png", fullPage: true });
  await dialog.getByRole("button", { name: "完成", exact: true }).click();
  await page.getByRole("button", { name: "解析当前", exact: true }).click();
  await page.locator(".template-source").waitFor();
  assert.ok((await page.locator(".inspector .source").innerText()).includes(directory));
  await page.locator(".template-source > summary").click();
  assert.equal(await page.locator(".template-source pre").innerText(), command);
  await page.screenshot({ path: "artifacts/project-mapping-result.png", fullPage: true });
  await page.reload();
  await page.getByRole("button", { name: "设置用例内目录", exact: true }).click();
  assert.equal(await page.getByLabel("用例 /project 映射目录", { exact: true }).inputValue(), directory);
  await page.keyboard.press("Escape");
  await page.getByLabel("自定义命令", { exact: true }).fill(command);
  const response = page.waitForResponse((r) => r.url().endsWith("/api/parse") && r.request().method() === "POST");
  await page.getByRole("button", { name: "解析自定义", exact: true }).click();
  assert.equal((await (await response).json()).input.templateCommand, command);
  await page.locator(".template-source").waitFor();
  for (const width of [1366, 760, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.getByRole("button", { name: "设置用例内目录", exact: true }).click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const bounds = await dialog.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width);
    if (width === 390) await page.screenshot({ path: "artifacts/project-mapping-mobile.png", fullPage: true });
    await page.keyboard.press("Escape");
  }
  assert.deepEqual(pageErrors, []);
  const evidence = { batchRun: batch.id, counts: batch.counts, comparison: comparison.id, directory, parsedDecision: parsed.report.policy.decision, pageErrors, checks: ["actual CLI input and unchanged corpus", "missing directory returns 400", "317-case batch with mapping", "snapshot and comparison provenance", "header button, source, custom and persisted preference", "1366/760/390/320px dialog bounds"] };
  fs.writeFileSync("artifacts/project-mapping-validation.json", JSON.stringify(evidence, null, 2));
  console.log("PASS " + JSON.stringify(evidence));
} finally { await browser.close(); }
