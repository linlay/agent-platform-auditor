import { beforeEach, describe, expect, test, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { resetSchemaRegistryForTest } from "./domain/schemaRegistry";

const root = path.resolve(__dirname, "..");

function installClipboardMock() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText
    }
  });
  return writeText;
}

beforeEach(() => {
  resetSchemaRegistryForTest();
  vi.stubGlobal("fetch", async (url: string) => {
    const cleanUrl = String(url).replace(/^\//, "");
    const filePath = path.join(root, "public", cleanUrl);
    return {
      ok: true,
      status: 200,
      json: async () => JSON.parse(fs.readFileSync(filePath, "utf8"))
    };
  });
});

describe("App file import", () => {
  test("single file replaces textarea and auto parses", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await screen.findByText("JSONL (聊天记录)");

    const fileRecord = {
      chatId: "chat-file",
      runId: "run-file",
      updatedAt: 1780837893831,
      liveSeq: 7,
      query: {
        requestId: "req-file",
        chatId: "chat-file",
        role: "user",
        message: "hello from file",
        runId: "run-file"
      },
      _type: "query"
    };
    const file = new File([JSON.stringify(fileRecord)], "chat.jsonl", { type: "application/jsonl" });

    await user.upload(screen.getByLabelText("选择日志文件"), file);

    await waitFor(() => {
      expect(screen.getByDisplayValue(JSON.stringify(fileRecord))).toBeTruthy();
      expect(screen.getByText("run-file")).toBeTruthy();
      expect(screen.getByText((content, element) => element?.className === "tl-type" && content === "query")).toBeTruthy();
      expect(screen.getByText("hello from file")).toBeTruthy();
      expect(container.querySelector(".tl-header-default .tl-h-seq")?.textContent).toBe("Seq");
      expect(container.querySelector(".tl-header-default .tl-h-live-seq")?.textContent).toBe("LiveSeq");
    });
  });

  test("HAR WebSocket file uses WS timeline columns", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await screen.findByText("JSONL (聊天记录)");

    const harRaw = fs.readFileSync(path.join(root, "test/fixtures/ws/har-websocket.json"), "utf8");
    const file = new File([harRaw], "capture.har", { type: "application/json" });

    await user.upload(screen.getByLabelText("选择日志文件"), file);

    await screen.findByText("WebSocket Frame 日志", { selector: ".mode-badge" });
    await waitFor(() => expect(container.querySelectorAll(".tl-entry-ws")).toHaveLength(5));

    expect(container.querySelector(".timeline-panel .timeline")).toBeTruthy();
    expect(container.querySelector(".tl-header-ws .tl-h-dir")?.textContent).toBe("Dir");
    expect(container.querySelector(".tl-header-ws .tl-h-frame")?.textContent).toBe("Frame");
    expect(container.querySelector(".tl-header-ws .tl-h-type")?.textContent).toBe("Type");
    expect(container.querySelector(".tl-header-ws .tl-h-id")?.textContent).toBe("ID");
    expect(container.querySelector(".tl-header-ws .tl-h-seq")).toBeNull();
    expect(container.querySelector(".tl-header-ws .tl-h-live-seq")).toBeNull();
    expect(screen.queryByText("LiveSeq")).toBeNull();

    const dirs = Array.from(container.querySelectorAll(".tl-ws-dir")).map((element) => element.textContent);
    const frames = Array.from(container.querySelectorAll(".tl-ws-frame")).map((element) => element.textContent);
    const types = Array.from(container.querySelectorAll(".tl-ws-type")).map((element) => element.textContent);
    const ids = Array.from(container.querySelectorAll(".tl-ws-id")).map((element) => element.textContent);

    expect(dirs).toEqual(["send", "receive", "receive", "receive", "receive"]);
    expect(frames).toEqual(["request", "push", "response", "stream", "stream"]);
    expect(types).toContain("/api/query");
    expect(types).toContain("connected");
    expect(types).toContain("content.delta");
    expect(ids).toContain("req-1");
  });

  test("global issues render below overview and select their record", async () => {
    const user = userEvent.setup();
    const writeText = installClipboardMock();
    const { container } = render(<App />);
    await screen.findByText("JSONL (聊天记录)");

    const issueRecord = {
      chatId: "chat-issues",
      runId: "run-issues",
      updatedAt: 1780837893831,
      liveSeq: 1,
      query: {
        requestId: "req-issues",
        chatId: "chat-issues",
        role: "user",
        message: "issue selection target",
        runId: "run-issues"
      },
      _type: "query",
      extraTop: "boom"
    };
    const file = new File([JSON.stringify(issueRecord)], "issues.jsonl", { type: "application/jsonl" });

    await user.upload(screen.getByLabelText("选择日志文件"), file);

    const leftPanel = container.querySelector(".left-panel") as HTMLElement;
    const rightPanel = container.querySelector(".right-panel") as HTMLElement;
    expect(within(rightPanel).queryByRole("button", { name: "问题" })).toBeNull();
    expect(within(rightPanel).getByRole("button", { name: "属性" })).toBeTruthy();
    expect(within(rightPanel).getByRole("button", { name: "原始json" })).toBeTruthy();

    expect(await within(leftPanel).findByText((content, element) => element?.className === "issues-group-title severity-error" && content.startsWith("错误 ("))).toBeTruthy();
    expect(within(leftPanel).getByText("UNKNOWN_FIELD")).toBeTruthy();
    expect(within(leftPanel).getByText("未知字段 extraTop")).toBeTruthy();

    await user.click(within(leftPanel).getByRole("button", { name: "复制问题 UNKNOWN_FIELD extraTop" }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Code: UNKNOWN_FIELD"));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Path: extraTop"));

    const issueButton = within(leftPanel).getByText("UNKNOWN_FIELD").closest("button");
    expect(issueButton).toBeTruthy();
    await user.click(issueButton as HTMLButtonElement);

    expect(await screen.findByText("属性校验 #1 (query)")).toBeTruthy();
    await user.click(within(rightPanel).getByRole("button", { name: "复制问题 UNKNOWN_FIELD extraTop" }));

    expect(writeText).toHaveBeenLastCalledWith(expect.stringContaining("字段 'extraTop' 不在 schema 定义中"));
  });

  test("raw JSON tab searches, highlights, reports misses, and copies full text", async () => {
    const user = userEvent.setup();
    const writeText = installClipboardMock();
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView
    });
    const { container } = render(<App />);
    await screen.findByText("JSONL (聊天记录)");

    const fileRecord = {
      chatId: "chat-raw",
      runId: "run-raw",
      updatedAt: 1780837893831,
      liveSeq: 9,
      query: {
        requestId: "req-raw",
        chatId: "chat-raw",
        role: "user",
        message: "raw search target",
        runId: "run-raw"
      },
      _type: "query"
    };
    const file = new File([JSON.stringify(fileRecord)], "raw.jsonl", { type: "application/jsonl" });

    await user.upload(screen.getByLabelText("选择日志文件"), file);
    await user.click(await screen.findByText("raw search target"));

    expect(screen.queryByRole("button", { name: "json" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "原始json" }));

    expect(screen.getByRole("button", { name: "复制" })).toBeTruthy();
    await user.type(screen.getByPlaceholderText("搜索原始 JSON..."), "requestId");

    expect(screen.getByText("命中 1")).toBeTruthy();
    expect(container.querySelectorAll("mark.raw-json-highlight")).toHaveLength(1);
    expect(container.querySelector("mark.raw-json-highlight")?.textContent).toBe("requestId");
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: "center", inline: "nearest" }));

    await user.clear(screen.getByPlaceholderText("搜索原始 JSON..."));
    await user.type(screen.getByPlaceholderText("搜索原始 JSON..."), "missing-value");

    expect(screen.getByText("无命中")).toBeTruthy();
    expect(container.querySelectorAll("mark.raw-json-highlight")).toHaveLength(0);
    expect(screen.getByText((content) => content.includes("\"requestId\": \"req-raw\""))).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "复制" }));

    expect(writeText).toHaveBeenCalledWith(JSON.stringify(fileRecord, null, 2));
  });

  test("property panel expands array entries as a tree", async () => {
    const user = userEvent.setup();
    const writeText = installClipboardMock();
    render(<App />);
    await screen.findByText("JSONL (聊天记录)");

    const fileRecord = {
      chatId: "chat-systems",
      runId: "run-systems",
      updatedAt: 1780837893831,
      liveSeq: 1,
      query: {
        requestId: "req-systems",
        chatId: "chat-systems",
        role: "user",
        message: "message with systems",
        runId: "run-systems"
      },
      systems: [
        {
          role: "system",
          content: "follow repo conventions",
          meta: {
            source: "plan"
          }
        }
      ],
      _type: "query"
    };
    const file = new File([JSON.stringify(fileRecord)], "systems.jsonl", { type: "application/jsonl" });

    await user.upload(screen.getByLabelText("选择日志文件"), file);
    await user.click(await screen.findByText("message with systems"));

    expect(await screen.findByText("属性校验 #1 (query)")).toBeTruthy();
    expect(screen.getByText("[1 项]")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "0" })).toBeNull();
    expect(screen.queryByText("\"system\"")).toBeNull();

    await user.hover(screen.getByRole("button", { name: "systems" }));
    await user.click(screen.getByRole("button", { name: "复制 systems" }));

    expect(writeText).toHaveBeenCalledWith(JSON.stringify(fileRecord.systems, null, 2));

    await user.click(screen.getByRole("button", { name: "systems" }));

    expect(await screen.findByRole("button", { name: "0" })).toBeTruthy();
    expect(screen.queryByText("\"system\"")).toBeNull();
    expect(screen.queryByRole("button", { name: "meta" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "0" }));

    expect(screen.getByText("\"system\"")).toBeTruthy();
    expect(screen.getByText("\"follow repo conventions\"")).toBeTruthy();
    expect(screen.getByRole("button", { name: "meta" })).toBeTruthy();
    expect(screen.queryByText("\"plan\"")).toBeNull();

    await user.hover(screen.getByText("\"system\""));
    await user.click(screen.getByRole("button", { name: "复制 systems.0.role" }));

    expect(writeText).toHaveBeenCalledWith("\"system\"");

    await user.click(screen.getByRole("button", { name: "systems" }));

    expect(screen.queryByRole("button", { name: "0" })).toBeNull();
    expect(screen.queryByText("\"system\"")).toBeNull();
    expect(screen.getByText("[1 项]")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "systems" }));

    expect(await screen.findByRole("button", { name: "0" })).toBeTruthy();
    expect(screen.queryByText("\"system\"")).toBeNull();
  });
});
