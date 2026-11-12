import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer, validateReport } from '../backend/server.mjs';

test('report input rejects malformed and oversized data', () => {
  for (const value of [null, [], {}, { input: ' ', text: 'report' }, { input: 'a'.repeat(9001), text: 'report' }, { input: 'valid', text: 'r'.repeat(24001) }]) {
    assert.throws(() => validateReport(value));
  }
});

test('concurrent saves remain durable and history keeps only the latest 20', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'auditor-reports-'));
  const server = createServer(directory);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const invalid = await fetch(base + '/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken' });
    assert.equal(invalid.status, 400);
    const results = await Promise.all(Array.from({ length: 25 }, (_, i) => fetch(base + '/api/reports', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input: `input ${i}`, text: `report ${i}`, runId: `run-${i}` })
    })));
    assert.ok(results.every((response) => response.status === 201));
    const { items } = await (await fetch(base + '/api/reports')).json();
    assert.equal(items.length, 20);
    assert.equal(new Set(items.map((item) => item.id)).size, 20);
    assert.deepEqual(JSON.parse(await readFile(path.join(directory, 'reports.json'), 'utf8')), items);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true });
  }
});

test('review fixes the package Agent and ignores browser-supplied Platform options',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'auditor-review-'));let call;
 const config={copilot:{agentKey:'auditor',references:[{type:'skill',id:'review-checklist'}]},authentication:{mode:'none'}};
 const server=createServer(directory,{config,platform:async(route,body)=>{call={route,body};return {content:'模型审阅结果'};}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  const response=await fetch(`http://127.0.0.1:${server.address().port}/api/review`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({input:'方案正文',agentKey:'other',chatId:'existing',model:{key:'foreign'},accessLevel:'full_access'})});
  assert.equal(response.status,200);assert.equal((await response.json()).text,'模型审阅结果');
  assert.equal(call.route,'/api/query');assert.equal(call.body.agentKey,'auditor');assert.notEqual(call.body.chatId,'existing');assert.equal(call.body.accessLevel,'ask_for_approval');assert.equal(call.body.editingMode,false);assert.deepEqual(call.body.references,config.copilot.references);assert.equal(call.body.model,undefined);
 }finally{await new Promise(r=>server.close(r));await rm(directory,{recursive:true});}
});

test('SSO report history is isolated by host identity',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'auditor-owners-'));
 const server=createServer(directory,{config:{authentication:{mode:'sso'}}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  assert.equal((await fetch(base+'/api/reports')).status,401);
  assert.equal((await fetch(base+'/api/reports',{method:'POST',headers:{'Content-Type':'application/json','X-Webapp-User':'one'},body:JSON.stringify({input:'private',text:'report'})})).status,201);
  const list=async(user)=>(await(await fetch(base+'/api/reports',{headers:{'X-Webapp-User':user}})).json()).items;
  assert.equal((await list('one')).length,1);assert.equal((await list('two')).length,0);
 }finally{await new Promise(r=>server.close(r));await rm(directory,{recursive:true});}
});
