import http from 'node:http';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const MAX_BODY = 96 * 1024;

export function validateReport(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('报告必须是对象');
  if (typeof value.input !== 'string' || !value.input.trim() || value.input.length > 9000) throw new Error('审阅文本应为 1–9000 字符');
  if (typeof value.text !== 'string' || !value.text.trim() || value.text.length > 24000) throw new Error('报告内容应为 1–24000 字符');
  return { input: value.input.trim(), text: value.text, chatId: typeof value.chatId === 'string' ? value.chatId.slice(0, 128) : '', runId: typeof value.runId === 'string' ? value.runId.slice(0, 128) : '' };
}

function json(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(data));
}

export function createServer(dataRoot) {
  const file = path.join(dataRoot, 'reports.json');
  // Serialize read/modify/write operations so concurrent saves cannot lose data.
  let writes = Promise.resolve();
  async function reports() {
    try { return JSON.parse(await readFile(file, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  }
  return http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      if (request.method === 'GET' && url.pathname === '/api/health') return json(response, 200, { status: 'ready', storage: 'webapp-data', node: process.versions.node });
      if (request.method === 'GET' && url.pathname === '/api/reports') { await writes; return json(response, 200, { items: await reports() }); }
      if (request.method !== 'POST' || url.pathname !== '/api/reports') return json(response, 404, { error: 'not_found' });
      if (!request.headers['content-type']?.startsWith('application/json')) return json(response, 415, { error: '请提交 JSON' });
      let size = 0; const chunks = [];
      for await (const chunk of request) {
        size += chunk.length;
        if (size > MAX_BODY) return json(response, 413, { error: '报告超过大小限制' });
        chunks.push(chunk);
      }
      let value;
      try { value = validateReport(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch (error) { return json(response, 400, { error: error.message }); }
      const report = { id: randomUUID(), createdAt: Date.now(), ...value };
      const operation = writes.then(async () => {
        const items = [report, ...await reports()].slice(0, 20);
        await mkdir(dataRoot, { recursive: true });
        const temporary = file + '.tmp';
        await writeFile(temporary, JSON.stringify(items), { mode: 0o600 });
        await rename(temporary, file);
      });
      writes = operation.catch(() => {});
      await operation;
      return json(response, 201, { report });
    } catch { return json(response, 500, { error: '本地报告存储不可用' }); }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.env.WEBAPP_DATA_DIR) throw new Error('请由 Platform 启动后端');
  const server = createServer(process.env.WEBAPP_DATA_DIR);
  server.listen(Number(process.env.PORT), process.env.HOST);
  process.on('SIGTERM', () => server.close(() => process.exit(0)));
}
