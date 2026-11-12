import { createReportStore } from './report-store.js';
import { request as readJSON } from '/__webapp/client.js';
const $ = (id) => document.getElementById(id);
const source = $('source');
let current;
let reports;
const sample = `独立 WebApp 托管方案（待审阅）

1. 为方便调用，Node 后端获得整个 runtime 目录的读写权限，并直接读取 .state 中的 owner JWT。
2. 页面把一次性 ticket 放在 URL 参数中，通过 GET 换取会话。
3. 模型配置复用主环境 registries，应用可以修改里面的模型文件。
4. 只在 macOS 开发环境试过启动，现在标记 Windows 和 Linux 全部验收通过。
5. 应用升级失败后直接重试，不需要停止旧后端，也没有回滚记录。`;

function fail(error) { $('error').textContent = error instanceof Error ? error.message : String(error); $('error').hidden = false; }
function showReport(value) {
  current = value; $('empty').hidden = true; $('report').hidden = false;
  $('report').replaceChildren();
  for (const line of value.text.split('\n')) {
    const node = document.createElement(line.startsWith('## ') ? 'h3' : 'p');
    node.textContent = line.replace(/^## /, ''); $('report').append(node);
  }
  $('run-info').textContent = value.runId ? `Run ${value.runId.slice(0, 16)}…` : '本地报告';
  $('download').disabled = false; $('save').disabled = false;
}
async function history() {
  const items = await reports.list(); $('history-list').replaceChildren();
  if (!items.length) { const node = document.createElement('p'); node.className = 'muted'; node.textContent = '还没有保存的报告。'; $('history-list').append(node); }
  for (const item of items) {
    const button = document.createElement('button'); button.className = 'history-item';
    const title = document.createElement('strong'); title.textContent = item.input.split('\n')[0].slice(0, 50);
    const date = document.createElement('span'); date.textContent = new Date(item.createdAt).toLocaleString('zh-CN');
    button.append(title, date); button.onclick = () => { source.value = item.input; count(); showReport(item); }; $('history-list').append(button);
  }
}
function count() { $('counter').textContent = `${source.value.length.toLocaleString()} / 9,000`; }
source.addEventListener('input', count);
$('sample').onclick = () => { source.value = sample; count(); source.focus(); };
$('review').onclick = async () => {
  const input = source.value.trim(); if (!input) { source.focus(); fail(new Error('请先输入待审阅文本，或载入示例。')); return; }
  $('review').disabled = true; $('error').hidden = true; $('progress').textContent = 'Agent 正在按审阅清单检查文本…';
  try {
    const result = await readJSON('/api/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input }) });
    showReport({ input, ...result }); $('progress').textContent = '审阅完成，可以保存或下载报告。';
  } catch (error) { fail(error); $('progress').textContent = '审阅未完成，可查看错误后重试。'; }
  finally { $('review').disabled = false; }
};
$('save').onclick = async () => {
  if (!current) return; $('save').disabled = true;
  try { await reports.save(current); await history(); $('progress').textContent = reports.browser ? '已保存到当前浏览器本地。' : '已保存到独立实例的 webapp-data。'; }
  catch (error) { fail(error); }
  finally { $('save').disabled = false; }
};
$('download').onclick = () => {
  if (!current) return;
  const url = URL.createObjectURL(new Blob([current.text], { type: 'text/markdown;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = `审阅报告-${new Date().toISOString().slice(0, 10)}.md`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};

try {
  const [{ appConfig }, { items }] = await Promise.all([readJSON('/api/config'), readJSON('/api/skills')]);
  reports = createReportStore(appConfig.reportStorage, { request: readJSON, storage: localStorage, uuid: () => crypto.randomUUID(), now: () => Date.now() });
  if (!reports.browser) await readJSON('/api/health');
  else { $('storage-location').textContent = '保留最近 20 份 · 浏览器本地（纯前端容器版）'; $('stack-info').textContent = '容器内 Platform / Agent / Skill / 外部模型接口'; }
  $('model-key').textContent = appConfig.model;
  const demo = appConfig.modelMode === 'demo';
  $('model-mode').textContent = demo ? '本机规则演示 · 不调用真实 LLM' : '真实模型 · 使用本实例私有 registry';
  $('model-notice').textContent = demo ? '当前配置指向可选规则测试服务；需单独启用测试模型，或配置真实模型接口。' : '当前使用你指定的真实模型，输入会发送到所配置的模型服务。';
  $('skill-state').textContent = items.find((item) => item.skillId === 'review-checklist')?.name || '包内技能已挂载';
  $('connection').textContent = reports.browser ? '容器内 Platform · 已连接' : '独立 Platform · 已连接'; $('connection-dot').classList.add('ready'); $('review').disabled = false;
  await history();
} catch (error) { $('connection').textContent = '连接失败'; $('connection-dot').classList.add('failed'); fail(error); }
