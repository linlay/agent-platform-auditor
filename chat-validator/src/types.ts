export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type Obj = { [key: string]: Json };
export function obj(value: unknown): Obj {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new ProtocolError('Expected a JSON object');
  return value as Obj;
}
export function arr(value: unknown): Json[] {
  if (!Array.isArray(value)) throw new ProtocolError('Expected a JSON array');
  return value as Json[];
}
export function str(value: unknown): string {
  if (typeof value !== 'string') throw new ProtocolError('Expected a string');
  return value;
}
export class ProtocolError extends Error { override name = 'ProtocolError'; }
export class EnvironmentError extends Error { override name = 'EnvironmentError'; }
export class TimeoutError extends Error { override name = 'TimeoutError'; }
export class Skipped extends Error { override name = 'Skipped'; }
export function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
export interface CaseDefinition {
  id: string;
  title: string;
  group: 'protocol' | 'chat' | 'capability' | 'multiturn' | 'steer' | 'planning' | 'interrupt';
  action: string;
  steps?: string[];
  method?: string;
  path?: string;
  body?: Obj;
  raw?: string;
  status?: number;
  error?: string;
  authenticated?: boolean;
}
export interface Config {
  baseUrl: string;
  tokenFile?: string;
  token?: string;
  agentKey?: string;
  timeoutMs: number;
  projectAgentKey?: string;
  projectFile?: string;
  projectExpect?: string;
  botAgentKey?: string;
  keepChats: boolean;
}
export type Status = 'passed' | 'failed' | 'skipped' | 'environment_error' | 'timeout' | 'protocol_error';
export interface Evidence { kind: string; [key: string]: unknown }
export interface CaseResult {
  id: string; title: string; group: string; status: Status; durationMs: number;
  message?: string; evidence: Evidence[];
}
