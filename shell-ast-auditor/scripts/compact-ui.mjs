import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs";
fs.mkdirSync("artifacts", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
const checks = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1366, height: 1000 },
  });
  // This fixture deliberately tests a literal path outside the workspace.
  // Directory substitution has its own CLI/API/browser integration check.
  await page.addInitScript(() => localStorage.setItem("shell-ast-auditor.project-dir.v1", ""));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("http://127.0.0.1:8093/");
  await page
    .getByRole("heading", { name: "bash.pipeline", exact: true })
    .waitFor();
  const header = await page.locator(".app-header").boundingBox();
  assert.equal(header.height, 52);
  assert.equal(
    await page
      .getByLabel("搜索用例", { exact: true })
      .evaluate((e) => e.getBoundingClientRect().height),
    32,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "解析当前", exact: true })
      .evaluate((e) => e.getBoundingClientRect().height),
    28,
  );
  checks.push("desktop: header 52px / input 32px / button 28px");
  await page.screenshot({
    path: "artifacts/compact-after.png",
    fullPage: true,
  });
  await page
    .getByLabel("自定义命令", { exact: true })
    .fill("git -C /project status");
  await page
    .getByLabel("自定义审查模式", { exact: true })
    .selectOption("evaluation");
  await page.getByRole("button", { name: "解析自定义", exact: true }).click();
  await page
    .locator(".policy-panel .decision")
    .filter({ hasText: "需要人工确认" })
    .waitFor();
  assert.ok(
    (await page.locator(".policy-reasons").innerText()).includes("/project"),
  );
  const tag = page
    .locator(".policy-categories .tag")
    .filter({ hasText: "读取范围外路径" });
  assert.equal(await tag.getAttribute("title"), "read-outside-roots");
  assert.equal(
    await page
      .locator(".policy-panel .technical-details")
      .evaluate((e) => e.open),
    false,
  );
  assert.equal(
    await page
      .locator(".policy-panel")
      .getByText("standalone-host", { exact: false })
      .isVisible(),
    false,
  );
  await page.locator("main").evaluate((e) => (e.scrollTop = 0));
  await page.locator(".inspector").evaluate((e) => (e.scrollTop = 0));
  await tag.hover();
  assert.equal(
    await page.getByRole("tooltip").innerText(),
    "read-outside-roots",
  );
  await page.screenshot({
    path: "artifacts/compact-tooltip.png",
    fullPage: true,
  });
  await page.mouse.move(0, 0);
  await tag.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  assert.equal(
    await page.getByRole("tooltip").innerText(),
    "read-outside-roots",
  );
  checks.push(
    "Chinese policy decision/reasons/categories; hover and keyboard show English; original report preserved",
  );
  await page.screenshot({
    path: "artifacts/compact-after-policy.png",
    fullPage: true,
  });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.screenshot({ path: "artifacts/compact-dark.png", fullPage: true });
  await page.emulateMedia({ colorScheme: "light" });
  for (const width of [1280, 1024, 760, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      "page overflow at " + width,
    );
    const extra = await page
      .locator("main")
      .evaluate((e) => ({
        scroll: e.scrollWidth,
        client: e.clientWidth,
        over: [...e.querySelectorAll("*")]
          .map((n) => ({
            tag: n.tagName,
            cls: n.className,
            text: n.textContent.slice(0, 70),
            right: n.getBoundingClientRect().right,
            left: n.getBoundingClientRect().left,
          }))
          .filter((n) => n.right > innerWidth || n.left < 0),
      }));
    if (extra.scroll > extra.client)
      console.log("Overflow", width, JSON.stringify(extra));
    assert.equal(
      extra.scroll > extra.client,
      false,
      "main overflow at " + width,
    );
    if (width <= 760) {
      assert.ok(
        await page
          .getByRole("button", { name: "解析当前", exact: true })
          .evaluate((e) => e.getBoundingClientRect().height >= 44),
      );
      assert.equal(
        await page
          .getByLabel("搜索用例", { exact: true })
          .evaluate((e) => getComputedStyle(e).fontSize),
        "16px",
      );
    }
    await page.screenshot({
      path: "artifacts/compact-" + width + ".png",
      fullPage: true,
    });
  }
  checks.push(
    "1280/1024/760/390/320px: no horizontal page overflow; mobile controls >=44px and input text 16px",
  );
  const touch = await browser.newPage({
    viewport: { width: 1024, height: 1000 },
    hasTouch: true,
  });
  await touch.goto("http://127.0.0.1:8093/");
  await touch
    .getByRole("heading", { name: "bash.pipeline", exact: true })
    .waitFor();
  assert.ok(
    await touch
      .getByRole("button", { name: "解析当前", exact: true })
      .evaluate((e) => e.getBoundingClientRect().height >= 44),
  );
  await touch.close();
  checks.push("coarse pointer: 44px targets");
  assert.equal(errors.length, 0, errors.join("\n"));
  fs.writeFileSync(
    "artifacts/compact-validation.json",
    JSON.stringify(
      {
        at: new Date().toISOString(),
        reference:
          "/Users/linlay/Project/zenmind-transit-hub/transit-hub-website/docs/ui-compact-draft/SPEC.md",
        checks,
        pageErrors: errors,
      },
      null,
      2,
    ),
  );
  console.log("PASS " + JSON.stringify(checks));
} catch (e) {
  console.error(e);
  throw e;
} finally {
  await browser.close();
}
