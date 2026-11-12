import test from 'node:test';import assert from 'node:assert/strict';import {collectPlatformSSE} from '../backend/platform-client.mjs';
function response(events){const bytes=new TextEncoder().encode(events);return new Response(new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=3)c.enqueue(bytes.slice(i,i+3));c.close();}}),{headers:{'Content-Type':'text/event-stream'}});}
const event=e=>'event: message\ndata: '+JSON.stringify(e)+'\n\n';
test('collects complete UTF-8 model deltas and ignores other runs',async()=>{
 const content='完整审阅报告'.repeat(80);const stream=event({type:'content.delta',runId:'other',delta:'ignored'})+event({type:'content.delta',runId:'main',delta:content})+event({type:'run.complete',runId:'main'})+'data: [DONE]\n\n';
 assert.equal((await collectPlatformSSE(response(stream),'main')).content,content);
});
test('rejects run failure, truncated streams and oversized reports',async()=>{
 for(const stream of [event({type:'run.error'}),event({type:'content.delta',delta:'partial'}),event({type:'content.delta',delta:'x'.repeat(24001)})])await assert.rejects(collectPlatformSSE(response(stream)));
});
