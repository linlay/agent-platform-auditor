import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Runner } from '../scenarios/runner.js';
import { loadCases, selectCases } from '../cases.js';
import { loadConfig } from '../config.js';
import { writeReport } from '../reporting/report.js';
import type { Evidence, CaseResult } from '../types.js';

export interface Job { id: string; state: 'running'|'cleaning'|'completed'; startedAt: string; results: CaseResult[]; cleanupErrors: string[]; current: string; currentStep: string; liveEvidence: Evidence[]; stop: boolean; error?: string }
export class Jobs {
  private jobs = new Map<string, Job>();
  constructor(private reportsRoot: string) {}
  get(id: string): Job | undefined { return this.jobs.get(id); }
  async start(input: unknown): Promise<Job> {
    if ([...this.jobs.values()].some(j => j.state !== 'completed')) throw new Error('已有测试正在运行，请等待或停止后续执行');
    if (!input || typeof input !== 'object') throw new Error('无效的运行参数');
    const data = input as Record<string, unknown>;
    if (!Array.isArray(data.ids) || !data.ids.length || data.ids.length > 100 || data.ids.some(id=>typeof id!=='string')) throw new Error('请选择要运行的用例');
    if (typeof data.token !== 'string' || data.token.length > 16000 || typeof data.agentKey !== 'string' || data.agentKey.length > 200) throw new Error('Token 或 Agent 参数无效');
    const cases = selectCases(await loadCases(), (data.ids as string[]).join(','));
    if ([...this.jobs.values()].some(j=>j.state!=='completed')) throw new Error('已有测试正在运行');
    const config = loadConfig({ PLATFORM_URL:'http://127.0.0.1:11949',PLATFORM_TOKEN:data.token,PLATFORM_AGENT_KEY:data.agentKey,PLATFORM_TIMEOUT_MS:'120000' });
    const id = 'ui-' + new Date().toISOString().replaceAll(':','-') + '-' + randomUUID().slice(0,8);
    const job: Job = { id,state:'running',startedAt:new Date().toISOString(),results:[],cleanupErrors:[],current:'',currentStep:'',liveEvidence:[],stop:false };
    this.jobs.set(id,job);
    // Only public Job fields are exposed; Config (including JWT) stays inside
    // this task and is released after cleanup. Runs always use the real Runner.
    const task = async () => {
      const runner = new Runner(config,undefined,e=>{job.currentStep=String(e.title??'');job.liveEvidence.push(e);});
      try {
        for (const c of cases) {
          if (job.stop) break;
          job.current = c.id;job.currentStep='准备场景';job.liveEvidence=[];
          job.results.push(await runner.execute(c));
          await writeReport(join(this.reportsRoot,id),config,job.results,job.cleanupErrors,job.startedAt);
        }
      } catch { job.error = '执行中发生错误，请检查结果和清理记录'; }
      finally {
        job.state='cleaning';
        try { job.cleanupErrors.push(...await runner.cleanup()); }
        catch { job.cleanupErrors.push('清理发生异常，请按报告中的 Chat ID 检查'); }
        if (job.stop) job.cleanupErrors.push('用户停止后续用例；当前用例已收尾，剩余用例未执行');
        try { await writeReport(join(this.reportsRoot,id),config,job.results,job.cleanupErrors,job.startedAt); }
        catch { job.error='报告保存失败；当前结果仍可从页面导出'; }
        delete config.token;
        job.current='';job.state='completed';
        // Bound retained in-memory results; durable reports remain available.
        for(const [key,value] of this.jobs) if(this.jobs.size>10&&value.state==='completed'&&key!==id)this.jobs.delete(key);
      }
    };
    void task();
    return job;
  }
}
