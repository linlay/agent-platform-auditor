import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CaseResult, Config } from '../types.js';

export function redact(value: unknown): unknown {
  if (typeof value === 'string') return value
    .replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED_JWT]')
    .replace(/([?&](?:t|token|access_token)=)[^&\s"']+/gi, '$1[REDACTED]');
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key,
    /token|secret|password|authorization|cookie|api.?key|ticket/i.test(key) ? '[REDACTED]' : redact(item)]));
  return value;
}
export function exitCode(results: CaseResult[], cleanupErrors: string[]): number {
  return cleanupErrors.length || results.some(r => !['passed', 'skipped'].includes(r.status)) ? 1 : results.some(r => r.status === 'passed') ? 0 : 2;
}
export async function writeReport(directory: string, config: Config, results: CaseResult[], cleanupErrors: string[], startedAt: string): Promise<void> {
  await mkdir(directory, { recursive: true });
  const summary = Object.fromEntries(['passed', 'failed', 'skipped', 'environment_error', 'timeout', 'protocol_error'].map(status => [status, results.filter(r => r.status === status).length]));
  const report = redact({ startedAt, finishedAt: new Date().toISOString(), baseUrl: config.baseUrl, agentKey: config.agentKey,
    keepChats: config.keepChats, summary, cleanupErrors, results });
  await writeFile(join(directory, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  const lines = ['# Agent Platform 验证结果', '', `地址：${config.baseUrl}`, `开始：${startedAt}`, '',
    ...Object.entries(summary).map(([key, count]) => `- ${key}: ${count}`), '',
    '| ID | 场景 | 结果 | 耗时 ms |', '| --- | --- | --- | --- |',
    ...results.map(r => `| ${r.id} | ${r.title.replaceAll('|', '\\|')} | ${r.status} | ${r.durationMs} |`), '',
    ...results.filter(r => r.message).map(r => `- ${r.id}: ${r.message}`), '',
    '未配置的能力记为 skipped；投递收据、HTTP 200 和 [DONE] 均不单独代表对话通过。',
    ...(cleanupErrors.length ? ['', '清理错误：', ...cleanupErrors.map(e => `- ${e}`)] : [])];
  await writeFile(join(directory, 'report.md'), String(redact(lines.join('\n'))) + '\n');
}
