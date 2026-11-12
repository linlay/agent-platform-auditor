import type { AuditIssue, JsonObject, JsonValue, Severity } from "./types";

export function isPlainObject(value: JsonValue | unknown): value is JsonObject {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

export function compactText(value: unknown, maxLen = 140): string {
  if (!hasValue(value)) return "";
  let text: string;
  if (typeof value === "string") {
    text = value;
  } else {
    try {
      text = JSON.stringify(value);
    } catch {
      text = String(value);
    }
  }
  text = text.replace(/\s+/g, " ").trim();
  return text.length > maxLen ? `${text.slice(0, Math.max(0, maxLen - 3))}...` : text;
}

export function shortJson(value: unknown, maxLen = 80): string {
  if (value === undefined) return "undefined";
  try {
    const text = JSON.stringify(value);
    if (!text) return String(value);
    return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;
  } catch {
    return String(value);
  }
}

export function valueAtPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (!part) continue;
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function makeIssue(
  severity: Severity,
  code: string,
  title: string,
  recordIndex: number,
  path: string,
  expected: string,
  actual: string,
  message: string
): AuditIssue {
  return {
    severity,
    code,
    title,
    recordIndex,
    path: path || "",
    expected: expected || "",
    actual: actual || "",
    message: message || ""
  };
}
