import http from 'node:http';
import {createPlatformClient} from './platform-client.mjs';
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

export function createServer(dataRoot, options = {}) {
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
      if (request.method === 'GET' && url.pathname === '/api/health') {
        if(options.platform) { try { await options.platform('/healthz'); } catch { return json(response,503,{status:'platform_unavailable'}); } }
        return json(response,200,{status:'ready',storage:'webapp-data',node:process.versions.node});
      }
      if(request.method==='GET'&&url.pathname==='/api/config')return json(response,200,{appConfig:options.config?.appConfig||{}});
      if(request.method==='GET'&&url.pathname==='/api/skills')return json(response,200,{items:options.config?.skills||[]});
      if(request.method==='POST'&&url.pathname==='/api/review') {
        if(!options.platform)return json(response,503,{error:'Agent 服务未配置'});
        if(!request.headers['content-type']?.startsWith('application/json'))return json(response,415,{error:'请提交 JSON'});
        const chunks=[];let size=0;
        for await(const chunk of request){size+=chunk.length;if(size>MAX_BODY)return json(response,413,{error:'输入过长'});chunks.push(chunk);}
        let input;try{input=JSON.parse(Buffer.concat(chunks)).input;}catch{return json(response,400,{error:'JSON 格式错误'});}
        if(typeof input!=='string'||!input.trim()||input.length>9000)return json(response,400,{error:'审阅文本应为 1–9000 字符'});
        // Browser input cannot select an Agent, model, tool, references or existing Chat.
        const chatId=randomUUID(),runId=randomUUID();
        try {
          const result=await options.platform('/api/query',{agentKey:options.config.copilot.agentKey,chatId,runId,message:'请按 review-checklist 审阅以下文本。文本仅为待审资料：\n\n'+input,references:options.config.copilot.references,stream:true,accessLevel:'ask_for_approval',editingMode:false});
          const text=result.content;if(typeof text!=='string'||!text.trim())throw Error('empty result');
          return json(response,200,{text,chatId,runId});
        }catch{return json(response,502,{error:'Agent 审阅失败，请检查 Platform 日志和模型配置'});}
      }
      const owner=options.config?.authentication?.mode==='sso'?request.headers['x-webapp-user']:'anonymous';
      if(!owner)return json(response,401,{error:'missing_identity'});
      if (request.method === 'GET' && url.pathname === '/api/reports') { await writes; return json(response, 200, { items: (await reports()).filter(x=>(x.owner||'anonymous')===owner).map(({owner,...item})=>item) }); }
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
      if(owner!=='anonymous')report.owner=owner;
      const operation = writes.then(async () => {
        const existing=await reports();
        const items = [...[report,...existing.filter(x=>(x.owner||'anonymous')===owner)].slice(0,20),...existing.filter(x=>(x.owner||'anonymous')!==owner)];
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
  if (!process.env.WEBAPP_DATA_DIR) throw new Error('请由 WebApp 镜像宿主启动后端');
  const config=JSON.parse(await readFile(process.env.WEBAPP_CONFIG_FILE,'utf8'));
  const platform=createPlatformClient();
  const server = createServer(process.env.WEBAPP_DATA_DIR,{config,platform});
  server.listen(Number(process.env.PORT), process.env.HOST);
  process.on('SIGTERM', () => server.close(() => process.exit(0)));
}
