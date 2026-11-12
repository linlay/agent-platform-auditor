import { describe, expect, it } from 'vitest';
import { Workflow } from '../src/scenarios/workflows.js';
import { PlatformClient } from '../src/platform/client.js';
import { obj, type Obj, type Config } from '../src/types.js';
const config:Config={baseUrl:'http://127.0.0.1:11949',timeoutMs:1000,keepChats:false};
const success=(data:unknown)=>new Response(JSON.stringify({code:0,data}));
function replay(action:string,mailOrigin?:string){
 let controller:ReadableStreamDefaultController<Uint8Array>,seq=0,marker='',target='',active=true,canceled=false,execution=false,runId='run-1';
 const requests:Obj[]=[];const encode=new TextEncoder();
 const emit=(event:Obj)=>controller.enqueue(encode.encode('data: '+JSON.stringify({seq:++seq,timestamp:1794412800000,runId,...event})+'\n\n'));
 const end=(terminal='run.complete',text=target||marker)=>{if(terminal==='run.complete')emit({type:'content.delta',contentId:'content',delta:text});emit({type:terminal});controller.enqueue(encode.encode('data: [DONE]\n\n'));controller.close();active=false;canceled=terminal==='run.cancel';};
 const ask=(id='a1')=>emit({type:'awaiting.ask',mode:action.startsWith('plan-')?'planning':'question',awaitingId:id,questions:[{id:'q',type:'text'}]});
 const transport:typeof fetch=async(input,init)=>{
  const url=new URL(String(input));const b=init?.body?obj(JSON.parse(String(init.body))):{};requests.push({path:url.pathname,...b});
  if(url.pathname==='/api/agent')return success({tools:['wait','ask_user_question']});
  if(url.pathname==='/api/chat')return success({lastRunId:execution?'execute-2':runId,canContinue:canceled,...(active?{activeRun:{runId,planningMode:action.startsWith('plan-')}}:{}),...(action.includes('question')&&active?{awaiting:{mode:'question'}}:{}),runs:execution||runId==='run-2'?[{runId:'run-1'},{runId:execution?'execute-2':'run-2'}]:[{runId:'run-1'}]});
  if(url.pathname==='/api/query'){
   if(b.message===''){runId='run-2';active=true;}
   const message=String(b.message);marker=message.match(/FLOW_[a-f0-9]+/)?.[0]??marker;
   const stream=new ReadableStream<Uint8Array>({start(c){controller=c;emit({type:'run.start'});if(b.message===''){end();return;}if(action.startsWith('steer-')||action==='interrupt-wait')emit({type:'tool.wait',toolId:'wait-1'});else if(action==='interrupt-output')emit({type:'content.delta',contentId:'content',delta:'partial output'});else ask();}});
   return new Response(stream,{headers:{'content-type':'text/event-stream'}});
  }
  if(url.pathname==='/api/steer'){
   if(action==='plan-steer'){target=String(b.message).match(/REV_[a-f0-9]+/)![0];emit({type:'planning.superseded'});ask('a2');}
   else{target=action==='steer-reference'?String(obj((b.references as Obj[])[0]).text):String(b.message).match(/NEW_[a-f0-9]+/)?.[0]??marker;emit({type:'request.steer',steerId:b.steerId??'',...(mailOrigin?{mailOrigin}:{})});emit({type:'tool.result',result:{reason:mailOrigin?'mail':'steered',continued:b.message===''}});end();}
   return success({accepted:true,steerId:b.steerId});
  }
  if(url.pathname==='/api/interrupt'){end('run.cancel');return success({accepted:true});}
  if(url.pathname==='/api/submit'){
   if(canceled||(action==='plan-steer'&&b.awaitingId==='a1'))return new Response(JSON.stringify({code:409,msg:'already_resolved'}),{status:409});
   if(action.startsWith('plan-')){
    const param=obj(b.param);if(param.decision==='reject'){target=String(param.reason).match(/REV_[a-f0-9]+/)![0];ask('a2');}
    else{execution=true;end();}
   }else{target=String(obj((b.params as Obj[])[0]).answer);emit({type:'awaiting.answer'});end();}
   return success({accepted:true});
  }
  if(url.pathname==='/api/attach')return new Response('data: '+JSON.stringify({type:'content.delta',contentId:'content',delta:target||marker})+'\n\ndata: '+JSON.stringify({type:'run.complete',runId:'execute-2'})+'\n\ndata: [DONE]\n\n',{headers:{'content-type':'text/event-stream'}});
  if(url.pathname==='/api/chat/jsonl')return new Response(JSON.stringify({_type:'query',runId:'execute-2',planRunId:'run-1'})+'\n');
  throw new Error('Unexpected route '+url.pathname);
 };
 return {client:new PlatformClient(config,transport),requests};
}

describe('stateful workflow control (offline protocol replay)',()=>{
 it.each(['steer-change','steer-continue','steer-reference','plan-approve','plan-reject','plan-steer','interrupt-output','interrupt-wait','question-resume'])('%s traverses actual protocol transitions',async action=>{
  const mock=replay(action);const workflow=new Workflow({config,client:mock.client,newChat:()=> 'cv_fixture',agent:async()=> 'general'});
  await workflow.run(action);
  expect(mock.client.evidence.some(e=>e.kind==='workflow-step')).toBe(true);
  if(action.startsWith('plan-')){expect(mock.requests.some(r=>r.path==='/api/attach')).toBe(true);expect(mock.requests.filter(r=>r.path==='/api/submit'&&r.param&&obj(r.param).decision==='approve')).toHaveLength(action==='plan-steer'?2:1);}
  if(action.startsWith('interrupt-'))expect(mock.requests.some(r=>r.path==='/api/query'&&r.message==='')).toBe(true);
 });
 it('recognizes a mailbox wake only when linked to the matching user steer',async()=>{
  const valid=replay('steer-change','user');await new Workflow({config,client:valid.client,newChat:()=> 'cv_fixture',agent:async()=> 'general'}).run('steer-change');
  const other=replay('steer-change','agent');await expect(new Workflow({config,client:other.client,newChat:()=> 'cv_fixture',agent:async()=> 'general'}).run('steer-change')).rejects.toThrow('matching user');
 });
 it('does not pass a control ack without the required live terminal and tool evidence',async()=>{
  const client=new PlatformClient(config,async input=>String(input).includes('/api/agent')?success({tools:['wait']}):new Response('data: {"type":"run.start","runId":"r"}\n\ndata: {"type":"run.complete","runId":"r"}\n\ndata: [DONE]\n\n',{headers:{'content-type':'text/event-stream'}}));
  await expect(new Workflow({config,client,newChat:()=> 'cv_fixture',agent:async()=> 'general'}).run('steer-change')).rejects.toThrow('did not call wait');
 });
});
