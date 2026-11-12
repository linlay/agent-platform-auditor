import { createServer, type Server } from 'node:http';
import { readdir, readFile, lstat, realpath } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { redact } from '../reporting/report.js';
import { loadCases } from '../cases.js';
import { Jobs } from './jobs.js';

const projectRoot = fileURLToPath(new URL('../../../', import.meta.url));
export async function readReport(root: string, id: string): Promise<Record<string, unknown>> {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,160}$/.test(id) || id.includes('..')) throw new Error('Invalid report ID');
  const base = await realpath(root);
  const directory = join(base, id);
  const file = join(directory, 'report.json');
  if ((await lstat(directory)).isSymbolicLink() || (await lstat(file)).isSymbolicLink()) throw new Error('Report links are not allowed');
  if (!(await realpath(file)).startsWith(base + sep)) throw new Error('Report outside reports directory');
  if ((await lstat(file)).size > 20 * 1024 * 1024) throw new Error('Report exceeds 20 MB');
  const data: unknown = JSON.parse(await readFile(file, 'utf8'));
  if (!data || typeof data !== 'object' || !Array.isArray((data as Record<string, unknown>).results)) throw new Error('Invalid report format');
  return redact(data) as Record<string, unknown>;
}
export async function listReports(root: string) {
  const reports: Record<string, unknown>[] = [];
  const issues: string[] = [];
  let entries;
  try { entries = await readdir(root, { withFileTypes: true }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { reports, issues }; throw error; }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const report = await readReport(root, entry.name);
      reports.push({ id: entry.name, startedAt: report.startedAt, finishedAt: report.finishedAt, baseUrl: report.baseUrl, summary: report.summary, total: (report.results as unknown[]).length });
    } catch { issues.push(`${entry.name}: 报告损坏、仍在写入或不可读取，请刷新重试`); }
  }
  reports.sort((a, b) => String(b.finishedAt ?? '').localeCompare(String(a.finishedAt ?? '')));
  return { reports, issues };
}
export function createReportServer(reportsRoot = join(projectRoot, 'reports'), assetsRoot = join(projectRoot, 'ui')): Server {
  const jobs = new Jobs(reportsRoot);
  return createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    const send = (status: number, value: unknown) => { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); response.end(JSON.stringify(value)); };
    try {
      const url = new URL(request.url ?? '/', 'http://localhost');
      const origin = `http://${request.headers.host}`;
      const allowedHosts = [`127.0.0.1:${request.socket.localPort}`,`localhost:${request.socket.localPort}`];
      if (!allowedHosts.includes(request.headers.host??'') || (request.headers.origin && request.headers.origin!==origin)) { send(403,{error:'仅接受本机同源请求'});return; }
      if(request.method==='POST') {
        if(request.headers['x-validator-request']!=='1'){send(403,{error:'缺少本机操作标识'});return;}
        if(url.pathname==='/api/runs'){
          let content='';
          for await(const chunk of request){content+=String(chunk);if(Buffer.byteLength(content)>65536){send(413,{error:'请求过大'});return;}}
          try{const job=await jobs.start(JSON.parse(content));send(202,{id:job.id});}catch(error){send(400,{error:(error as Error).message});}
          return;
        }
        const match=/^\/api\/runs\/([^/]+)\/stop$/.exec(url.pathname);
        if(match){const job=jobs.get(match[1]!);if(!job){send(404,{error:'运行不存在'});return;}job.stop=true;send(200,{accepted:true});return;}
      }
      if (request.method !== 'GET') { send(405, { error: 'Method not allowed' }); return; }
      if(url.pathname.startsWith('/api/runs/')){const job=jobs.get(url.pathname.slice(10));if(!job){send(404,{error:'运行不存在'});return;}send(200,redact(job));return;}
      if (url.pathname === '/api/reports') { send(200, await listReports(reportsRoot)); return; }
      if (url.pathname === '/api/cases') { send(200, await loadCases()); return; }
      if (url.pathname.startsWith('/api/reports/')) {
        try { send(200, await readReport(reportsRoot, decodeURIComponent(url.pathname.slice(13)))); }
        catch { send(404, { error: '报告不存在或无法读取，请刷新或导入 JSON 文件' }); }
        return;
      }
      const assets: Record<string, [string, string]> = {
        '/': [join(assetsRoot, 'index.html'), 'text/html; charset=utf-8'],
        '/styles.css': [join(assetsRoot, 'styles.css'), 'text/css; charset=utf-8'],
        '/app.js': [fileURLToPath(new URL('./app.js', import.meta.url)), 'text/javascript; charset=utf-8']
      };
      const asset = assets[url.pathname];
      if (!asset) { send(404, { error: 'Not found' }); return; }
      response.writeHead(200, { 'Content-Type': asset[1] }); response.end(await readFile(asset[0]));
    } catch { if (!response.headersSent) send(500, { error: '无法加载报告，请检查报告目录后重试' }); else response.end(); }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.UI_PORT ?? 11950);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid UI_PORT');
  const server = createReportServer();
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Chat Validator → http://127.0.0.1:${port}`));
}
