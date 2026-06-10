import { beforeEach, describe, expect, test, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { render, screen, waitFor } from "@testing-library/react";
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
    render(<App />);
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
    });
  });

  test("raw JSON tab searches, highlights, reports misses, and copies full text", async () => {
    const user = userEvent.setup();
    const writeText = installClipboardMock();
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
