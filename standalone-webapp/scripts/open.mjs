import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
async function json(file) { return JSON.parse(await readFile(file, 'utf8')); }

export async function createLoginServer(runtime = path.join(ROOT, '.runtime'), port = 0) {
  const nonce = randomBytes(24).toString('base64url');
  const server = http.createServer(async (req, res) => {
    if (req.method !== 'GET' || req.url !== '/open/' + nonce || req.headers.host !== '127.0.0.1:' + server.address().port) { res.writeHead(404); res.end(); return; }
    try {
      const [ready, owner, manifest] = await Promise.all(['run/ready.json', '.state/webapp-owner/owner.json', 'webapp.json'].map(file => json(path.join(runtime, file))));
      const response = await fetch(ready.apiUrl + '/api/admin/webapps/' + manifest.id + '/launch-ticket', {
        method: 'POST', headers: { Authorization: 'Bearer ' + owner.token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnPath: '/' }), signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) throw new Error('ticket unavailable');
      const ticket = (await response.json()).data;
      if (new URL(ticket.action).origin !== ready.appUrl) throw new Error('unexpected origin');
      const exchanged = await fetch(ticket.action, {
        method: 'POST', redirect: 'manual', headers: { Origin: ready.apiUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ ticket: ticket.ticket }), signal: AbortSignal.timeout(15000)
      });
      const cookie = exchanged.headers.get('set-cookie');
      if (exchanged.status !== 303 || !cookie) throw new Error('session unavailable');
      res.writeHead(303, { 'Set-Cookie': cookie, Location: ready.appUrl + '/', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }); res.end();
    } catch { res.writeHead(503); res.end('应用尚未就绪，请检查容器和运行日志。'); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return { server, url: 'http://127.0.0.1:' + server.address().port + '/open/' + nonce };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  function option(key, fallback) { const i = args.indexOf(key); if (i === -1) return fallback; if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(key + ' 需要参数'); return args[i + 1]; }
  const port = Number(option('--port', '0'));
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('端口无效');
  const { server, url } = await createLoginServer(path.resolve(option('--runtime-dir', path.join(ROOT, '.runtime'))), port);
  console.log('打开页面：' + url + '\n登录辅助仅监听本机；Ctrl+C 关闭。');
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { server.closeAllConnections(); server.close(); });
}
