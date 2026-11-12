import {readFile} from 'node:fs/promises';

// Query's JSON response is a summary. Collect model deltas for the full report.
export async function collectPlatformSSE(response, runId) {
 if(!response.headers.get('content-type')?.startsWith('text/event-stream'))throw Error('expected Platform SSE');
 const decoder=new TextDecoder();let pending='',data=[],text='',complete=false;
 function dispatch(){
  if(!data.length)return;const raw=data.join('\n');data=[];if(raw==='[DONE]')return;
  const e=JSON.parse(raw);if(runId&&e.runId&&e.runId!==runId)return;
  if(['run.error','run.interrupted'].includes(e.type))throw Error('Agent run failed');
  if(e.type==='content.delta'){
   const delta=e.delta||e.text||'';if(typeof delta!=='string')throw Error('invalid delta');
   text+=delta;if(text.length>24000)throw Error('report exceeds size limit');
  }
  if(e.type==='run.complete')complete=true;
 }
 function consume(chunk){pending+=chunk;if(pending.length>256*1024)throw Error('Platform SSE frame exceeds limit');
  for(let i;(i=pending.indexOf('\n'))>=0;){const line=pending.slice(0,i).replace(/\r$/,'');pending=pending.slice(i+1);if(line==='')dispatch();else if(line.startsWith('data:'))data.push(line.slice(5).replace(/^ /,''));}
 }
 for await(const chunk of response.body)consume(decoder.decode(chunk,{stream:true}));
 consume(decoder.decode());if(pending)consume('\n');dispatch();
 if(!complete||!text.trim())throw Error('incomplete Agent response');return {content:text};
}
export function createPlatformClient(env=process.env) {
 return async(route,body)=>{
  const token=await readFile(env.WEBAPP_PLATFORM_TOKEN_FILE,'utf8');
  const response=await fetch(env.WEBAPP_PLATFORM_URL+route,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(body?240000:3000)});
  if(!response.ok)throw Error('Platform request failed: HTTP '+response.status);
  if(body?.stream)return collectPlatformSSE(response,body.runId);
  const value=await response.json();if(value.code!==0)throw Error('Platform request failed');return value.data;
 };
}
