const KEY = 'standalone-auditor-reports-v1';

// Static single-host deployments use browser storage explicitly. Node-backed
// deployments keep the existing server-side report API.
export function createReportStore(mode, { request, storage, uuid, now } = {}) {
  const browser = mode === 'browser';
  function load() {
    const items = JSON.parse(storage.getItem(KEY) || '[]');
    if (!Array.isArray(items)) throw new Error('浏览器报告数据格式异常，请检查站点存储。');
    return items;
  }
  return {
    browser,
    async list() { return browser ? load() : (await request('/api/reports')).items; },
    async save(value) {
      if (!browser) return request('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
      const report = { ...value, id: uuid(), createdAt: now() };
      storage.setItem(KEY, JSON.stringify([report, ...load()].slice(0, 20)));
      return { report };
    }
  };
}
