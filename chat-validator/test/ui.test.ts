import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createReportServer, listReports, readReport } from '../src/ui/server.js';
import { Jobs } from '../src/ui/jobs.js';
vi.mock('../src/scenarios/runner.js',()=>({Runner:class {
  async execute(c:{id:string;title:string;group:string}) {await new Promise(r=>setTimeout(r,25));return {...c,status:'passed',durationMs:25,evidence:[]};}
  async cleanup(){return [];}
}}));
const roots:string[]=[];
async function fixture(){const root=await mkdtemp(join(tmpdir(),'cv-ui-'));roots.push(root);await mkdir(join(root,'run'));await writeFile(join(root,'run','report.json'),JSON.stringify({finishedAt:'2026-11-12T01:00:00Z',results:[],token:'hidden'}));return root;}
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});
describe('report viewer boundary',()=>{
 it('lists actual reports and exposes no credentials',async()=>{const root=await fixture();const data=await listReports(root);expect(data.reports[0]?.id).toBe('run');expect((await readReport(root,'run')).token).toBe('[REDACTED]');});
 it.each(['../x','a/b','%2e%2e','a..b'])('rejects invalid report id %s',async id=>{await expect(readReport(await fixture(),id)).rejects.toThrow();});
 it('rejects symlink report files',async()=>{const root=await fixture();await rm(join(root,'run','report.json'));await writeFile(join(root,'secret.json'),'{}');await symlink(join(root,'secret.json'),join(root,'run','report.json'));await expect(readReport(root,'run')).rejects.toThrow('links');});
 it('surfaces corrupt reports rather than claiming no results',async()=>{const root=await fixture();await writeFile(join(root,'run','report.json'),'broken');expect((await listReports(root)).issues).toHaveLength(1);});
 it('handles a missing reports directory as empty',async()=>{const root=await fixture();expect((await listReports(join(root,'missing'))).reports).toEqual([]);});
 it('enforces same-origin mutations and serves reports over HTTP',async()=>{
  const root=await fixture();const server=createReportServer(root);await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address();if(!address||typeof address==='string')throw new Error('Missing address');const url=`http://127.0.0.1:${address.port}`;
  try{expect((await fetch(url+'/api/reports')).status).toBe(200);expect((await fetch(url+'/api/runs',{method:'POST',headers:{Origin:'http://evil.example','X-Validator-Request':'1'},body:'{}'})).status).toBe(403);expect((await fetch(url+'/api/runs',{method:'POST',body:'{}'})).status).toBe(403);expect((await fetch(url+'/api/reports/unknown')).status).toBe(404);}
  finally{await new Promise<void>((r,reject)=>server.close(e=>e?reject(e):r()));}
 });
});
describe('interactive batches',()=>{
 it('validates unknown cases before starting any execution',async()=>{const jobs=new Jobs(await fixture());await expect(jobs.start({ids:['INVALID'],token:'',agentKey:''})).rejects.toThrow('Unknown');});
 it('runs selected cases and saves the same standard report',async()=>{const root=await fixture();const jobs=new Jobs(root);const job=await jobs.start({ids:['P01','P02'],token:'test-credential',agentKey:'test'});for(let i=0;i<100&&job.state!=='completed';i++)await new Promise(r=>setTimeout(r,10));expect(job.state).toBe('completed');expect(job.results.map(c=>c.id)).toEqual(['P01','P02']);expect(JSON.stringify(job)).not.toContain('test-credential');expect((await readReport(root,job.id)).results).toHaveLength(2);});
 it('stops subsequent cases and still cleans and saves results',async()=>{const root=await fixture();const jobs=new Jobs(root);const job=await jobs.start({ids:['P01','P02'],token:'',agentKey:''});job.stop=true;for(let i=0;i<100&&job.state!=='completed';i++)await new Promise(r=>setTimeout(r,10));expect(job.results).toHaveLength(1);expect(job.cleanupErrors[0]).toContain('停止');expect(job.state).toBe('completed');});
 it('rejects overlapping batches',async()=>{const jobs=new Jobs(await fixture());const first=await jobs.start({ids:['P01'],token:'',agentKey:''});await expect(jobs.start({ids:['P02'],token:'',agentKey:''})).rejects.toThrow('已有');while(first.state!=='completed')await new Promise(r=>setTimeout(r,10));});
});
