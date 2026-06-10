import type { ErrorObject } from "ajv";
import type { AuditIssue, JsonValue, ParsedRecord, Strictness } from "./types";
import { getJsonlTypes, isKnownJsonlType, isSchemaRegistryLoaded, resolveJsonl } from "./schemaRegistry";
import { makeIssue, shortJson, valueAtPath } from "./utils";

export function validateJsonl(record: ParsedRecord, strictness: Strictness = "balanced"): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const data = record.data;
  if (!data) return issues;

  const type = jsonlType(data) ?? "unknown";
  if (!isSchemaRegistryLoaded()) {
    issues.push(
      makeIssue(
        "error",
        "SCHEMA_NOT_LOADED",
        "JSON Schema 未加载",
        record.index,
        "",
        "loaded JSONL schema registry",
        "not loaded",
        "schema registry 尚未加载，无法执行 JSONL 结构校验"
      )
    );
    return issues;
  }

  if (!isKnownJsonlType(type)) {
    issues.push(
      makeIssue(
        "error",
        "INVALID_TYPE",
        "未知的 _type",
        record.index,
        "_type",
        getJsonlTypes().join(", "),
        JSON.stringify(type),
        `_type 值为 '${type}'，不在合法集合中`
      )
    );
    return issues;
  }

  const resolved = resolveJsonl(data);
  if (!resolved || resolved.freeform || !resolved.validate) return issues;

  const valid = resolved.validate(data);
  if (valid) return issues;

  return (resolved.validate.errors ?? [])
    .map((err) => ajvErrorToIssue(err, data, record.index, strictness))
    .filter((issue): issue is AuditIssue => Boolean(issue));
}

function ajvErrorToIssue(err: ErrorObject, data: JsonValue, idx: number, strictness: Strictness): AuditIssue | null {
  if (err.keyword === "additionalProperties") {
    return unknownFieldIssue(err, data, idx);
  }

  let path = normalizeDataPath(err.instancePath || (err as ErrorObject & { dataPath?: string }).dataPath || "");
  let code = "SCHEMA_VALIDATION";
  let title = "JSON Schema 校验失败";
  let expected = err.message || "";
  let actual = "";

  if (err.keyword === "required") {
    const missing = String((err.params as { missingProperty?: string }).missingProperty ?? "");
    path = joinPath(path, missing);
    code = "MISSING_REQUIRED";
    title = `缺少必需字段 ${missing}`;
    expected = "required";
    actual = "undefined";
  } else if (err.keyword === "type") {
    code = "TYPE_MISMATCH";
    title = `类型错误 ${path}`;
    expected = String((err.params as { type?: string }).type ?? "");
    actual = actualTypeText(valueAtPath(data, path));
  } else if (err.keyword === "enum") {
    code = "INVALID_ENUM";
    title = `枚举值无效 ${path}`;
    expected = ((err.params as { allowedValues?: unknown[] }).allowedValues ?? []).join(", ");
    actual = shortJson(valueAtPath(data, path));
  } else if (err.keyword === "minimum") {
    code = "VALUE_OUT_OF_RANGE";
    title = `值超出范围 ${path}`;
    expected = `>= ${(err.params as { limit?: number }).limit}`;
    actual = shortJson(valueAtPath(data, path));
  } else {
    actual = shortJson(valueAtPath(data, path));
  }

  return makeIssue("error", code, title, idx, path, expected, actual, buildMessage(code, path, expected, actual, err.message));
}

function unknownFieldIssue(err: ErrorObject, data: JsonValue, idx: number): AuditIssue {
  const parentPath = normalizeDataPath(err.instancePath || (err as ErrorObject & { dataPath?: string }).dataPath || "");
  const field = String((err.params as { additionalProperty?: string }).additionalProperty ?? "");
  const path = joinPath(parentPath, field);
  const value = valueAtPath(data, path);
  return makeIssue(
    "error",
    "UNKNOWN_FIELD",
    `未知字段 ${path}`,
    idx,
    path,
    "schema 已知字段之一",
    shortJson(value),
    `字段 '${path}' 不在 schema 定义中`
  );
}

function buildMessage(code: string, path: string, expected: string, actual: string, fallback?: string): string {
  if (code === "MISSING_REQUIRED") return `必需字段 '${path}' 不存在`;
  if (code === "TYPE_MISMATCH") return `期望类型 ${expected}，实际为 ${actual}`;
  if (code === "INVALID_ENUM") return `值 ${actual} 不在合法枚举中`;
  if (code === "VALUE_OUT_OF_RANGE") return `值 ${actual} 小于最小值 ${expected}`;
  return fallback || "JSON Schema 校验失败";
}

function normalizeDataPath(path: string): string {
  if (!path) return "";
  if (path.charAt(0) === ".") return path.substring(1);
  if (path.charAt(0) === "/") return path.substring(1).replace(/\//g, ".");
  return path;
}

function joinPath(parent: string, child: string): string {
  if (!child) return parent || "";
  if (!parent) return child;
  return `${parent}.${child}`;
}

function actualTypeText(value: unknown): string {
  const type = Array.isArray(value) ? "array" : typeof value;
  return `${type} (${shortJson(value)})`;
}

function jsonlType(data: JsonValue): string | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const type = data._type;
  return typeof type === "string" ? type : null;
}
