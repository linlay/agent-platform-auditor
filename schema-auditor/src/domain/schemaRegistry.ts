import Ajv, { type ValidateFunction } from "ajv";
import type { JsonObject, JsonValue } from "./types";

interface Manifest {
  formats?: Record<string, FormatConfig | undefined>;
  rules?: Record<string, string | undefined>;
}

interface FormatConfig {
  discriminator?: string;
  schemaPaths?: string[];
  schemas?: Record<string, string>;
  freeformTypes?: string[];
  reserved?: boolean;
}

interface ResolvedSchema {
  type: string | null;
  schemaId: string | null;
  validate: ValidateFunction | null;
  freeform: boolean;
}

let manifest: Manifest | null = null;
let rulesByFormat: Record<string, JsonValue> = {};
let validators: Record<string, Record<string, ValidateFunction | undefined>> = {};
let ajv: Ajv | null = null;
let loaded = false;
let loadPromise: Promise<void> | null = null;

export function loadSchemaRegistry(options: { basePath?: string } = {}): Promise<void> {
  if (loadPromise) return loadPromise;

  const basePath = options.basePath ?? "";
  loadPromise = fetchJson<Manifest>(`${basePath}schemas/manifest.json`).then(async (nextManifest) => {
    const schemaPaths = uniqueStrings(
      Object.values(nextManifest.formats ?? {})
        .flatMap((format) => format?.schemaPaths ?? [])
    );
    const schemaList = await Promise.all(schemaPaths.map((schemaPath) => fetchJson<JsonObject>(`${basePath}${schemaPath}`)));
    const rules: Record<string, JsonValue> = {};
    await Promise.all(
      Object.entries(nextManifest.rules ?? {}).map(async ([format, rulePath]) => {
        if (rulePath) rules[format] = await fetchJson<JsonObject>(`${basePath}${rulePath}`);
      })
    );
    hydrateSchemaRegistry(nextManifest, schemaList, rules);
  });

  return loadPromise;
}

export function hydrateSchemaRegistry(nextManifest: Manifest, schemaList: JsonObject[], nextRulesByFormat: Record<string, JsonValue> = {}): void {
  manifest = nextManifest;
  rulesByFormat = nextRulesByFormat;
  validators = {};
  ajv = new Ajv({ allErrors: true, strict: false });

  schemaList.forEach((schema) => {
    if (typeof schema.$id === "string") {
      ajv?.addSchema(schema, schema.$id);
    }
  });

  Object.entries(manifest.formats ?? {}).forEach(([formatName, format]) => {
    const map = format?.schemas ?? {};
    validators[formatName] = {};
    Object.keys(map).forEach((type) => {
      validators[formatName][type] = ajv?.getSchema(map[type]);
      if (!validators[formatName][type]) {
        throw new Error(`无法编译 ${formatName} schema: ${type} -> ${map[type]}`);
      }
    });
  });

  loaded = true;
}

export function resolveJsonl(data: JsonValue | null): ResolvedSchema | null {
  return resolveFormat("jsonl", data);
}

export function resolveWs(data: JsonValue | null): ResolvedSchema | null {
  return resolveFormat("ws", data);
}

export function resolveFormat(formatName: string, data: JsonValue | null): ResolvedSchema | null {
  const format = manifest?.formats?.[formatName];
  if (!format) return null;
  const type = discriminatorValue(data, format.discriminator ?? "_type");
  const schemaId = type ? format.schemas?.[type] : undefined;
  return {
    type,
    schemaId: schemaId ?? null,
    validate: type && schemaId ? validators[formatName]?.[type] ?? null : null,
    freeform: isFreeformType(formatName, type)
  };
}

export function isKnownJsonlType(type: string | null): boolean {
  return isKnownType("jsonl", type);
}

export function isKnownWsFrame(type: string | null): boolean {
  return isKnownType("ws", type);
}

export function isKnownType(formatName: string, type: string | null): boolean {
  const format = manifest?.formats?.[formatName];
  if (!format || !type) return false;
  return !!format.schemas?.[type] || isFreeformType(formatName, type);
}

export function isJsonlFreeformType(type: string | null): boolean {
  return isFreeformType("jsonl", type);
}

export function isFreeformType(formatName: string, type: string | null): boolean {
  const freeform = manifest?.formats?.[formatName]?.freeformTypes ?? [];
  return !!type && freeform.includes(type);
}

export function getJsonlTypes(): string[] {
  return getFormatTypes("jsonl");
}

export function getWsFrameTypes(): string[] {
  return getFormatTypes("ws");
}

export function getFormatTypes(formatName: string): string[] {
  const format = manifest?.formats?.[formatName];
  if (!format) return [];
  const types = Object.keys(format.schemas ?? {});
  (format.freeformTypes ?? []).forEach((type) => {
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
  validators = {};
  ajv = null;
  loaded = false;
  loadPromise = null;
}

async function fetchJson<T extends JsonValue | Manifest>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`加载 ${path} 失败: HTTP ${res.status}`);
  return (await res.json()) as T;
}

function discriminatorValue(data: JsonValue | null, discriminator: string): string | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const type = (data as JsonObject)[discriminator];
  return typeof type === "string" ? type : null;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}
