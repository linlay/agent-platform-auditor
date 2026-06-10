import Ajv, { type ValidateFunction } from "ajv";
import type { JsonObject, JsonValue } from "./types";

interface Manifest {
  formats?: {
    jsonl?: {
      schemaPaths?: string[];
      schemas?: Record<string, string>;
      freeformTypes?: string[];
    };
  };
  rules?: {
    jsonl?: string;
  };
}

interface ResolvedJsonl {
  type: string | null;
  schemaId: string | null;
  validate: ValidateFunction | null;
  freeform: boolean;
}

let manifest: Manifest | null = null;
let rulesByFormat: Record<string, JsonValue> = {};
let validators: { jsonl: Record<string, ValidateFunction | undefined> } = { jsonl: {} };
let ajv: Ajv | null = null;
let loaded = false;
let loadPromise: Promise<void> | null = null;

export function loadSchemaRegistry(options: { basePath?: string } = {}): Promise<void> {
  if (loadPromise) return loadPromise;

  const basePath = options.basePath ?? "";
  loadPromise = fetchJson<Manifest>(`${basePath}schemas/manifest.json`).then(async (nextManifest) => {
    const jsonl = nextManifest.formats?.jsonl;
    const schemaPaths = jsonl?.schemaPaths ?? [];
    const schemaList = await Promise.all(schemaPaths.map((schemaPath) => fetchJson<JsonObject>(`${basePath}${schemaPath}`)));
    const rules: Record<string, JsonValue> = {};
    if (nextManifest.rules?.jsonl) {
      rules.jsonl = await fetchJson<JsonObject>(`${basePath}${nextManifest.rules.jsonl}`);
    }
    hydrateSchemaRegistry(nextManifest, schemaList, rules);
  });

  return loadPromise;
}

export function hydrateSchemaRegistry(nextManifest: Manifest, schemaList: JsonObject[], nextRulesByFormat: Record<string, JsonValue> = {}): void {
  manifest = nextManifest;
  rulesByFormat = nextRulesByFormat;
  validators = { jsonl: {} };
  ajv = new Ajv({ allErrors: true, strict: false });

  schemaList.forEach((schema) => {
    if (typeof schema.$id === "string") {
      ajv?.addSchema(schema, schema.$id);
    }
  });

  const map = manifest.formats?.jsonl?.schemas ?? {};
  Object.keys(map).forEach((type) => {
    validators.jsonl[type] = ajv?.getSchema(map[type]);
    if (!validators.jsonl[type]) {
      throw new Error(`无法编译 JSONL schema: ${type} -> ${map[type]}`);
    }
  });

  loaded = true;
}

export function resolveJsonl(data: JsonValue | null): ResolvedJsonl | null {
  const jsonl = manifest?.formats?.jsonl;
  if (!jsonl) return null;
  const type = jsonlType(data);
  const schemaId = type ? jsonl.schemas?.[type] : undefined;
  return {
    type,
    schemaId: schemaId ?? null,
    validate: type && schemaId ? validators.jsonl[type] ?? null : null,
    freeform: isJsonlFreeformType(type)
  };
}

export function isKnownJsonlType(type: string | null): boolean {
  const jsonl = manifest?.formats?.jsonl;
  if (!jsonl || !type) return false;
  return !!jsonl.schemas?.[type] || isJsonlFreeformType(type);
}

export function isJsonlFreeformType(type: string | null): boolean {
  const freeform = manifest?.formats?.jsonl?.freeformTypes ?? [];
  return !!type && freeform.includes(type);
}

export function getJsonlTypes(): string[] {
  const jsonl = manifest?.formats?.jsonl;
  if (!jsonl) return [];
  const types = Object.keys(jsonl.schemas ?? {});
  (jsonl.freeformTypes ?? []).forEach((type) => {
    if (!types.includes(type)) types.push(type);
  });
  return types;
}

export function getRules(format: string): JsonValue | null {
  return rulesByFormat[format] ?? null;
}

export function isSchemaRegistryLoaded(): boolean {
  return loaded;
}

export function resetSchemaRegistryForTest(): void {
  manifest = null;
  rulesByFormat = {};
  validators = { jsonl: {} };
  ajv = null;
  loaded = false;
  loadPromise = null;
}

async function fetchJson<T extends JsonValue | Manifest>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`加载 ${path} 失败: HTTP ${res.status}`);
  return (await res.json()) as T;
}

function jsonlType(data: JsonValue | null): string | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const type = (data as JsonObject)._type;
  return typeof type === "string" ? type : null;
}
