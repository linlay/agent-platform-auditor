import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { unzipSync, strFromU8 } from "fflate";
fs.mkdirSync("artifacts", { recursive: true });
const origin = process.env.AUDITOR_URL ?? "http://127.0.0.1:8093";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [],
  checks = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1366, height: 1000 },
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(origin);
  await page
    .getByRole("heading", { name: "bash.pipeline", exact: true })
    .waitFor();
  const inspector = page.locator(".inspector");
  const approvalTab = inspector.getByRole("tab", { name: "分类与审批", exact: true });
  const parsingTab = inspector.getByRole("tab", { name: "解析判断", exact: true });
  const manualMode = page.getByLabel("单用例模式", { exact: true });
  const manualAccess = page.getByLabel("单用例权限档位", { exact: true });
  const item = (id) => page.locator(`aside .case[data-case-id="${id}"]`);
  const single = page
    .locator(".sections")
    .getByRole("button", { name: "单用例测试", exact: true });
  const whole = page
    .locator(".sections")
    .getByRole("button", { name: "整集测试", exact: true });
  async function choose(id) {
    await item(id).click();
    await inspector.getByRole("heading", { name: id, exact: true }).waitFor();
    await expect(approvalTab).toHaveAttribute("aria-selected", "true");
  }
  async function parseCurrent(expectParsingMatch = true) {
    const response = page.waitForResponse(
      (r) => r.url().endsWith("/api/runs") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "解析当前", exact: true }).click();
    const run = await (await response).json();
    assert.equal(run.kind, "manual");
    assert.ok((await single.getAttribute("class")).includes("chosen"));
    assert.equal(await page.locator(".history").count(), 0);
    await expect(page.getByRole("button", { name: "解析当前", exact: true })).toBeEnabled();
    await expect(approvalTab).toHaveAttribute("aria-selected", "true");
    await parsingTab.click();
    if (expectParsingMatch) {
      await inspector
        .locator(".expectation-panel")
        .getByText("符合预期", { exact: true })
        .waitFor();
    }
    return run;
  }
  await expect(manualMode).toHaveValue("evaluation");
  await expect(manualAccess).toHaveValue("ask_for_approval");
  await expect(approvalTab).toHaveAttribute("aria-selected", "true");
  await manualMode.selectOption("syntax-only");
  await choose("bash.and-or");
  await expect(manualMode).toHaveValue("syntax-only");
  const a = await parseCurrent();
  await expect(
    inspector
      .getByRole("row", { name: /应识别的程序/ })
      .locator("td")
      .last(),
  ).toHaveText("git、echo");
  await choose("bash.pipeline");
  const b = await parseCurrent();
  assert.equal(await item("bash.and-or").locator(".judgment-green").count(), 1);
  assert.equal(
    await item("bash.pipeline").locator(".judgment-green").count(),
    1,
  );
  await choose("bash.and-or");
  await parsingTab.click();
  await expect(
    inspector
      .getByRole("row", { name: /应识别的程序/ })
      .locator("td")
      .last(),
  ).toHaveText("git、echo");
  checks.push(
    "parse A then B retains both indicators and opens each own report",
  );
  await page.screenshot({
    path: "artifacts/ui-accumulated.png",
    fullPage: true,
  });
  await page.reload();
  await page
    .getByRole("heading", { name: "bash.pipeline", exact: true })
    .waitFor();
  await choose("bash.and-or");
  await parsingTab.click();
  await expect(
    inspector
      .getByRole("row", { name: /应识别的程序/ })
      .locator("td")
      .last(),
  ).toHaveText("git、echo");
  assert.equal(
    await item("bash.pipeline").locator(".judgment-green").count(),
    1,
  );
  checks.push(
    "reload restores references and fetches earlier A from its original run",
  );
  await page.getByLabel("测试集", { exact: true }).selectOption("smoke");
  await expect(page.locator("aside .case")).toHaveCount(5);
  assert.equal(await item("bash.and-or").locator(".judgment-green").count(), 0);
  const selector = page.getByLabel("测试集", { exact: true });
  await expect(selector.locator('optgroup[label="Windows"] option')).toHaveCount(3);
  await expect(selector.locator('optgroup[label="macOS / Linux"] option')).toHaveCount(3);
  await page.getByLabel("更多筛选条件", { exact: true }).click();
  await page.getByLabel("platform", { exact: true }).selectOption("macos");
  await selector.selectOption("windows-smoke");
  await expect(page.locator("aside .case")).toHaveCount(3);
  await expect(page.getByLabel("platform", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("platform", { exact: true }).locator('option[value="macos"]')).toHaveCount(0);
  await page.getByLabel("更多筛选条件", { exact: true }).click();
  await expect(item("bash.pipeline")).toHaveCount(0);
  await expect(item("powershell.switch")).toHaveCount(1);
  await manualMode.selectOption("evaluation");
  await manualAccess.selectOption("ask_for_approval");
  await choose("powershell.switch");
  await parseCurrent(false);
  await approvalTab.click();
  const windowsDecision = inspector.locator(".policy-panel .decision");
  await expect(windowsDecision).toHaveText(/^(需要人工审批|无需人工审批 · 允许|已自动批准|禁止执行)$/);
  await expect(item("powershell.switch").locator(".approval-outcome")).toHaveText("审批：" + await windowsDecision.innerText());
  await expect(inspector.getByText("本条用例未设置审批预期。", { exact: true })).toBeVisible();
  await expect(inspector.locator(".expectation-panel")).toHaveCount(0);
  checks.push("Windows and macOS/Linux have separate groups and smoke inputs");
  await page.getByLabel("测试集", { exact: true }).selectOption("shell-core");
  await expect(item("bash.and-or").locator(".judgment-green")).toHaveCount(1);
  checks.push("testset switching retains isolated manual workspaces");
  await expect(manualMode).toHaveValue("evaluation");
  await expect(manualAccess).toHaveValue("ask_for_approval");
  await choose("bash.pipeline");
  const b2 = await parseCurrent();
  assert.equal(b2.cases[0].review.mode, "evaluation");
  assert.equal(b2.cases[0].review.accessLevel, "ask_for_approval");
  checks.push("manual testing defaults to evaluation with ask_for_approval; selecting a different case opens the approval tab");
  assert.equal(await item("bash.and-or").locator(".judgment-green").count(), 1);
  assert.equal(await item("bash.pipeline").locator(".judgment-red").count(), 1);
  assert.notEqual(b.id, b2.id);
  checks.push("rerun B replaces only B and preserves A");
  await page.getByLabel("选择 bash.sequence", { exact: true }).check();
  await page.getByLabel("选择 bash.git-stash", { exact: true }).check();
  const multiResponse = page.waitForResponse(
    (r) => r.url().endsWith("/api/runs") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "解析选中 (2)", exact: true }).click();
  const multi = await (await multiResponse).json();
  assert.equal(multi.kind, "manual");
  assert.equal(multi.cases.length, 2);
  await expect(item("bash.sequence").getByLabel("解析：符合预期", { exact: true })).toBeVisible();
  await expect(item("bash.sequence").locator(".approval-outcome")).toBeVisible();
  await expect(item("bash.sequence").getByLabel("审批：符合预期", { exact: true })).toHaveCount(0);
  await expect(item("bash.git-stash").getByLabel("解析：符合预期", { exact: true })).toBeVisible();
  assert.equal(await item("bash.and-or").locator(".judgment-green").count(), 1);
  assert.equal(await page.locator(".history").count(), 0);
  await page.getByLabel("全选当前列表", { exact: true }).check();
  await expect(
    page.getByRole("button", { name: "解析选中 (233)", exact: true }),
  ).toBeEnabled();
  await page.getByLabel("全选当前列表", { exact: true }).uncheck();
  checks.push(
    "manual mode supports multi-select and select-all without batch UI; previous rows survive",
  );
  async function exportAs(type, fileName) {
    await page.getByRole("button", { name: "导出报告", exact: true }).click();
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: type, exact: true }).click();
    const downloaded = await pending;
    await downloaded.saveAs("artifacts/" + fileName);
    await expect(page.getByRole("button", { name: "导出报告", exact: true })).toBeEnabled();
    return fs.readFileSync(await downloaded.path());
  }
  const html = (await exportAs("测试报告", "sample-test-report.html")).toString("utf8");
  assert.ok(html.includes(a.id) && html.includes(b2.id));
  assert.ok(!html.includes('"nativeTree"'));
  const reportPage = await browser.newPage();
  await reportPage.setContent(html);
  assert.equal(await reportPage.locator("#cases tbody tr").count(), 4);
  await reportPage.getByLabel("只看红点用例", { exact: true }).check();
  assert.equal(await reportPage.locator('#cases tbody tr:not([hidden])').count(), await reportPage.locator('#cases tbody tr[data-red="true"]').count());
  await reportPage.close();
  const zip = unzipSync(await exportAs("优化反馈包", "sample-optimization-feedback.zip"));
  const feedback = JSON.parse(strFromU8(zip["feedback.json"]));
  assert.ok(feedback.sourceRuns[a.id] && feedback.sourceRuns[b2.id]);
  assert.equal(strFromU8(zip["cases.jsonl"]).trim().split("\n").length, 4);
  assert.ok(feedback.findings.some(f => f.kind === "expectation-deviation" && f.cases.some(c => c.caseId === "bash.pipeline")));
  assert.ok(!feedback.findings.some(f => f.kind === "policy-review" && f.cases.some(c => c.caseId === "bash.pipeline")));
  for (const finding of feedback.findings) for (const e of finding.evidence) assert.ok(zip[e.file]);
  const exported = JSON.parse((await exportAs("完整数据", "sample-full-results.json")).toString("utf8"));
  assert.equal(exported.results["bash.and-or"].runId, a.id);
  assert.equal(exported.results["bash.pipeline"].runId, b2.id);
  assert.ok(exported.results["bash.and-or"].report);
  checks.push("3 exports: standalone HTML and red filter, self-contained feedback ZIP with provenance/reproduction/evidence, full JSON loads each row from its own run");
  await whole.click();
  await page.getByLabel("测试集", { exact: true }).selectOption("policy-smoke");
  await page
    .getByRole("heading", { name: "policy.classify-node", exact: true })
    .waitFor();
  assert.equal(
    await page.getByRole("button", { name: "解析当前", exact: true }).count(),
    0,
  );
  assert.equal(
    await page.getByRole("button", { name: "解析选中", exact: false }).count(),
    0,
  );
  assert.equal(await page.getByLabel("自定义命令", { exact: true }).count(), 0);
  assert.equal(
    await page.getByLabel("测试集", { exact: true }).locator("option").count(),
    6,
  );
  await page.getByLabel("搜索用例", { exact: true }).fill("readonly");
  const batchResponse = page.waitForResponse(
    (r) => r.url().endsWith("/api/runs") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "运行整个测试集", exact: true })
    .click();
  const batch = await (await batchResponse).json();
  assert.equal(batch.kind, "batch");
  assert.equal(batch.cases.length, 6);
  await page
    .getByRole("heading", { name: "批次号：" + batch.id, exact: true })
    .waitFor();
  await page.waitForFunction(() =>
    document.querySelector(".batch-summary")?.textContent.includes("6/6"),
  );
  await page.getByLabel("搜索用例", { exact: true }).fill("");
  assert.equal(await page.locator("aside .case").count(), 6);
  await choose("policy.ask-node");
  await inspector
    .locator(".policy-panel .decision")
    .filter({ hasText: "需要人工审批" })
    .waitFor();
  await expect(item("policy.ask-node").locator(".judgment-green")).toHaveCount(1);
  await expect(item("policy.ask-node").locator(".approval-outcome")).toHaveText("审批：需要人工审批");
  await expect(inspector.locator(".expectation-heading")).toContainText("符合预期");
  await page.screenshot({
    path: "artifacts/ui-whole-batch.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "查看本批次报告", exact: true })
    .click();
  await page.getByRole("heading", { name: /实际结果对预期/ }).waitFor();
  assert.equal(await page.locator(".comparison tbody tr").count(), 6);
  checks.push(
    "whole-set mode retains 6 testsets, ignores viewing filters for execution, shows batch ID/report and per-case details",
  );
  await single.click();
  await page.getByLabel("测试集", { exact: true }).selectOption("shell-core");
  await expect(item("bash.and-or").locator(".judgment-green")).toHaveCount(1);
  await expect(item("bash.pipeline").locator(".judgment-red")).toHaveCount(1);
  checks.push("whole batch does not overwrite accumulated manual results");
  const before = await (await page.request.get(origin + "/api/runs")).json();
  await page.getByRole("button", { name: "清空结果", exact: true }).click();
  await expect(
    page.locator("aside .judgment-green,aside .judgment-red"),
  ).toHaveCount(0);
  await page.reload();
  await page
    .getByRole("heading", { name: "bash.pipeline", exact: true })
    .waitFor();
  assert.equal(
    await page.locator("aside .judgment-green,aside .judgment-red").count(),
    0,
  );
  const after = await (await page.request.get(origin + "/api/runs")).json();
  assert.equal(after.length, before.length);
  await whole.click();
  await expect(page.getByLabel("测试集", { exact: true })).toBeEnabled();
  await page.getByLabel("已保存批次", { exact: true }).selectOption(batch.id);
  await page
    .getByRole("heading", { name: "批次号：" + batch.id, exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByLabel("已保存批次", { exact: true })
      .locator(`option[value="${a.id}"]`)
      .count(),
    0,
  );
  checks.push(
    "explicit clear persists across reload and does not delete saved run files; manual records are excluded from batch picker",
  );
  const batchHTML = (await exportAs("测试报告", "sample-batch-report.html")).toString("utf8");
  assert.ok(batchHTML.includes(batch.id));
  assert.equal((batchHTML.match(/<tr data-red=/g) ?? []).length, 6);
  await page.getByRole("button", { name: "查看本批次报告", exact: true }).click();
  await page.getByRole("heading", { name: "对比结果集", exact: true }).waitFor();
  const comparisonExport = JSON.parse((await exportAs("完整数据", "sample-comparison-results.json")).toString("utf8"));
  assert.equal(comparisonExport.comparison.targetRunId, batch.id);
  assert.equal(comparisonExport.cases.length, 6);
  assert.ok(comparisonExport.results["policy.ask-node"].report);
  checks.push("batch export preserves all 6 frozen cases; comparison export includes the selected target and raw evidence");
  assert.equal(errors.length, 0, errors.join("\n"));
  const evidence = {
    at: new Date().toISOString(),
    checks,
    manualRuns: [a.id, b.id, b2.id, multi.id],
    batchRun: batch.id,
    pageErrors: errors,
  };
  fs.writeFileSync(
    "artifacts/browser-validation.json",
    JSON.stringify(evidence, null, 2),
  );
  console.log("PASS " + JSON.stringify(evidence));
} catch (e) {
  console.error(e);
  throw e;
} finally {
  await browser.close();
}
