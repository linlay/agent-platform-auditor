import { readFile } from 'node:fs/promises';
import { arr, check, obj, str, type CaseDefinition } from './types.js';
export async function loadCases(): Promise<CaseDefinition[]> {
  const value: unknown = JSON.parse(await readFile(new URL('../cases/platform.json', import.meta.url), 'utf8').catch(async () =>
    // Compiled layout: dist/src/cases.js -> project/cases/platform.json.
    readFile(new URL('../../cases/platform.json', import.meta.url), 'utf8')));
  const definitions = arr(value).map(item => {
    const data = obj(item);
    for (const key of ['id', 'title', 'action']) str(data[key]);
    check(['protocol', 'chat', 'capability', 'multiturn', 'steer', 'planning', 'interrupt'].includes(str(data.group)), 'Invalid case group');
    if (data.action === 'http') { str(data.path); check(Number.isInteger(data.status), 'HTTP case requires expected status'); }
    return data as unknown as CaseDefinition;
  });
  check(new Set(definitions.map(c => c.id)).size === definitions.length, 'Duplicate case ID');
  return definitions;
}
export function selectCases(cases: CaseDefinition[], only?: string): CaseDefinition[] {
  if (!only) return cases;
  const names = only.split(',').map(s => s.trim());
  for (const name of names) check(cases.some(c => c.id === name || c.group === name), `Unknown case or group: ${name}`);
  return cases.filter(c => names.includes(c.id) || names.includes(c.group));
}
