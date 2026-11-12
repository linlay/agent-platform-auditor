import { resolve } from 'node:path';
import { loadCases, selectCases } from './cases.js';
import { loadConfig } from './config.js';
import { Runner } from './scenarios/runner.js';
import { exitCode, redact, writeReport } from './reporting/report.js';
import { check, type CaseResult } from './types.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('npm run validate -- [--only P01,C01,chat,capability] [--report-dir reports/run-name] [--keep-chats] [--list]\nConfigure exported PLATFORM_URL, PLATFORM_TOKEN_FILE, PLATFORM_AGENT_KEY. See README.md.'); return;
  }
  let only: string | undefined;
  let directory = resolve('reports', new Date().toISOString().replaceAll(':', '-'));
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--only' || arg === '--report-dir') {
      const value = args[++i]; check(value && !value.startsWith('--'), `${arg} requires a value`);
      if (arg === '--only') only = value; else directory = resolve(value);
    } else check(arg === '--list' || arg === '--keep-chats', `Unknown option: ${arg}`);
  }
  const cases = selectCases(await loadCases(), only);
  if (args.includes('--list')) { for (const c of cases) console.log(`${c.id}\t${c.group}\t${c.title}`); return; }
  const config = loadConfig(process.env, args.includes('--keep-chats'));
  const startedAt = new Date().toISOString();
  const runner = new Runner(config);
  const results: CaseResult[] = [];
  const cleanupErrors: string[] = [];
  let stopping = false;
  // Do not silently exit while a test owns Chat fixtures. Stop between cases;
  // current network work remains bounded by PLATFORM_TIMEOUT_MS.
  const stop = () => { stopping = true; console.log('Stopping after current case; cleaning owned Chat fixtures.'); };
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  console.log(`Validating ${config.baseUrl}: ${cases.length} cases`);
  try {
    for (const definition of cases) {
      if (stopping) break;
      const result = await runner.execute(definition); results.push(result);
      console.log(String(redact(`${result.id} ${result.status} (${result.durationMs}ms) ${result.title}${result.message ? ': ' + result.message : ''}`)));
      await writeReport(directory, config, results, cleanupErrors, startedAt);
    }
  } finally {
    cleanupErrors.push(...await runner.cleanup());
    if (stopping) cleanupErrors.push('Run interrupted; remaining cases were not executed');
    await writeReport(directory, config, results, cleanupErrors, startedAt);
    process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop);
  }
  console.log(`Report: ${directory}/report.md`);
  process.exitCode = exitCode(results, cleanupErrors);
}
main().catch(error => { console.error(String(redact(error instanceof Error ? error.message : String(error)))); process.exitCode = 2; });
