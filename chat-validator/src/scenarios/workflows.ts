import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { PlatformClient } from '../platform/client.js';
import { assistantText, assertCompleted } from '../platform/sse.js';
import { arr, obj, str, check, Skipped, TimeoutError, type Config, type Obj, type Evidence } from '../types.js';

export const workflowActions = new Set(['dialogue-revision','dialogue-branch','steer-change','steer-continue','steer-reference','plan-approve','plan-reject','plan-steer','interrupt-output','interrupt-wait','interrupt-question','question-resume']);
export interface WorkflowHost {
  client: PlatformClient; config: Config; progress?: (e:Evidence)=>void; agent(): Promise<string>; newChat(): string;
}
const id = () => randomUUID();
export class Workflow {
  private runId = '';
  private chatId: string;
  private agentKey = '';
  constructor(private host: WorkflowHost) { this.chatId=host.newChat(); }
  private record(title: string, data: Obj = {}) { const event={kind:'workflow-step',title,timestamp:Date.now(),chatId:this.chatId,runId:this.runId,...data};this.host.client.evidence.push(event);this.host.progress?.(event); }
  private async detail(): Promise<Obj> { return obj(await this.host.client.json('/api/chat?chatId='+encodeURIComponent(this.chatId)+'&detail=detailed&includeRawMessages=false')); }
  private async control(path:string,body:Obj):Promise<Obj>{
    const input={agentKey:this.agentKey,chatId:this.chatId,runId:this.runId,...body};
    const result=obj(await this.host.client.json(path,'POST',input));
    this.record(path,{request:input,response:result});return result;
  }
  private async steer(message:string,extra:Obj={}){const steerId=id();const result=await this.control('/api/steer',{requestId:id(),steerId,message,...extra});check(result.accepted===true,'Steer was not accepted');return steerId;}
  private async interrupt(){const result=await this.control('/api/interrupt',{requestId:id(),message:'测试中断并验证续跑'});check(result.accepted===true,'Interrupt was not accepted');}
  private async submit(event:Obj,param:Obj){const result=await this.control('/api/submit',{awaitingId:str(event.awaitingId),submitId:id(),param});check(result.accepted!==false,'Planning submit was not accepted');}
  private async question(event:Obj,answer:string){
    check(event.mode==='question','Unexpected HITL mode; automatic approval is forbidden');
    const questions=arr(event.questions).map(obj);check(questions.length===1&&questions[0]?.type==='text','Expected one synthetic text question');
    const result=await this.control('/api/submit',{awaitingId:str(event.awaitingId),submitId:id(),params:[{id:questions[0].id??'',answer}]});check(result.accepted!==false,'Question answer rejected');
  }
  private async stale(event:Obj){
    const reply=await this.host.client.raw('/api/submit','POST',{agentKey:this.agentKey,chatId:this.chatId,runId:this.runId,awaitingId:str(event.awaitingId),submitId:id(),...(event.mode==='planning'?{param:{decision:'approve'}}:{params:[{answer:'stale'}]})});
    this.record('过期等待项拒绝旧提交',{status:reply.status,response:obj(reply.json)});
    check(reply.status===409,'Old awaiting accepted or returned unrelated status: '+reply.status);
  }
  private async stream(message:string,extra:Obj={},handler?:(event:Obj)=>Promise<void>):Promise<{events:Obj[];text:string;runId:string}>{
    const request={agentKey:this.agentKey,chatId:this.chatId,requestId:id(),message,accessLevel:'ask_for_approval',editingMode:false,...extra};
    const events:Obj[]=[];this.record('发送用户消息',{request});
    try{
      await this.host.client.query(request,async event=>{
        events.push(event);if(typeof event.runId==='string')this.runId=event.runId;
        if(event.type==='awaiting.ask'&&!handler)throw new Error('Unexpected human interaction');
        await handler?.(event);
      });
      const text=assistantText(events);this.record('读取 Run 终态',{events,text});
      return {events,text,runId:this.runId};
    }catch(error){this.record('流程失败时的事件证据',{events});throw error;}
  }
  private async complete(message:string,extra:Obj={}){const result=await this.stream(message,extra);assertCompleted(result.events);check(result.text.trim(),'Empty final answer');return result;}
  private canceled(events:Obj[]){const terminals=events.filter(e=>['run.complete','run.cancel','run.error'].includes(String(e.type)));check(terminals.length===1&&terminals[0]?.type==='run.cancel','Interrupt must terminate as run.cancel');}
  private async idle(predicate:(detail:Obj)=>boolean):Promise<Obj>{
    const end=Date.now()+this.host.config.timeoutMs;
    while(Date.now()<end){const detail=await this.detail();if(predicate(detail))return detail;await delay(150);}
    throw new TimeoutError('Chat did not reach expected workflow state');
  }
  private waitPrompt(marker:string){return '这是控制协议测试。记住标记 '+marker+'。必须先调用 wait，offset="+30S"，description="等待测试器输入"。工具被 steer 提前结束后不要补等，立即按最新用户要求回答；没有新正文则只回复该标记。若该 Run 被中断后收到继续指令，直接回复该标记，绝不再次等待。只使用 wait，不访问文件或其他工具。';}
  private async requireTools(names:string[]){const detail=obj(await this.host.client.json('/api/agent?agentKey='+encodeURIComponent(this.agentKey)));const tools=arr(detail.tools);for(const name of names)if(!tools.includes(name))throw new Skipped('目标 Agent 未挂载 '+name+'，请选择具有该工具的 Native 测试 Agent');}
  async run(action:string):Promise<void>{
    this.agentKey=await this.host.agent();
    const marker='FLOW_'+id().replaceAll('-','');
    try{
      if(action==='dialogue-revision'){
        await this.complete('本对话项目编号 '+marker+'，初始预算80，城市上海。只确认这些值，不用工具。');
        await this.complete('预算改成120，城市改成苏州，项目编号不变。只确认修改，不用工具。');
        await this.complete('再把预算增加30，其他值不变。只确认，不用工具。');
        const result=await this.complete('现在只输出JSON {"project":项目编号,"budget":最终数字,"city":最终城市}，不用工具和Markdown。');
        const data=obj(JSON.parse(result.text.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g,'')));
        check(data.project===marker&&data.budget===150&&data.city==='苏州','Four-turn revision lost or resurrected values');return;
      }
      if(action==='dialogue-branch'){
        await this.complete('记住主对话订单 '+marker+'，状态=草稿。仅确认，不用工具。');
        const before=await this.detail();
        const branch=obj(await this.host.client.json('/api/query','POST',{agentKey:this.agentKey,chatId:this.chatId,lane:'btw',stream:false,message:'本分支把状态改成已取消。回复订单号和已取消，不用工具。',accessLevel:'ask_for_approval'}));
        this.record('旁路分支修改',{response:branch});check(str(branch.content).includes(marker)&&str(branch.content).includes('已取消'),'Branch did not inherit context');
        check((await this.detail()).lastRunId===before.lastRunId,'Branch changed main Run');
        const result=await this.complete('主对话订单号和状态是什么？不要使用旁路状态，不用工具。');check(result.text.includes(marker)&&result.text.includes('草稿')&&!result.text.includes('已取消'),'Branch leaked into main context');return;
      }
      if(action.startsWith('steer-')){
        await this.requireTools(['wait']);let sent='';const replacement='NEW_'+id().replaceAll('-','');let waitSeen=false;
        const result=await this.stream(this.waitPrompt(marker),{},async e=>{
          if(e.type==='awaiting.ask')throw new Error('Unexpected HITL while testing wait');
          if(e.type==='tool.wait'&&!waitSeen){waitSeen=true;await this.idle(d=>!!d.activeRun);this.record('确认工具等待仍在活动');
            sent=await this.steer(action==='steer-continue'?'':action==='steer-reference'?'只回复本次 selection 引用里的新标记，不要补等。':'需求已修改，只回复 '+replacement+'，不要再回复旧标记，不要补等。',action==='steer-reference'?{references:[{type:'selection',id:'workflow-selection',text:replacement}]}:{});
          }
        });
        assertCompleted(result.events);check(waitSeen,'Model did not call wait');
        check(result.events.some(e=>e.type==='request.steer'&&e.steerId===sent),'Accepted steer missing from stream');
        const serialized=JSON.stringify(result.events.filter(e=>e.type==='tool.result'));
        const matching=result.events.find(e=>e.type==='request.steer'&&e.steerId===sent);
        check(serialized.includes('steered')||(serialized.includes('mail')&&matching?.mailOrigin==='user'),'Wait did not end through the matching user steer / mailbox input');
        if(action==='steer-continue')check(serialized.includes('continued')&&result.text.includes(marker),'Blank steer did not continue wait');
        else check(result.text.includes(replacement)&&!result.text.includes(marker),'Steer did not update final output');
        check((await this.detail()).lastRunId===result.runId,'Steer opened a different Run');return;
      }
      if(action.startsWith('plan-')){
        let first:Obj|undefined;let confirmations=0;let approved=false;
        const replacement='REV_'+id().replaceAll('-','');
        const result=await this.stream('请规划一个最小任务：批准后仅回复标记 '+marker+'。计划只需一步，不访问文件、Shell、网络，不调用其他工具。请用 finalize_planning 提交计划等待确认。',{planningMode:true},async e=>{
          if(e.type!=='awaiting.ask')return;
          check(e.mode==='planning','Unexpected HITL mode in planning flow');confirmations++;
          if(confirmations>2)throw new Error('Planning kept asking confirmation after expected revisions');
          if(!first)first=e;
          this.record('计划等待人工确认',{awaiting:e});
          const detail=await this.detail();check(!!detail.activeRun&&obj(detail.activeRun).runId===this.runId&&obj(detail.activeRun).planningMode===true&&(!detail.runs||arr(detail.runs).every(r=>obj(r).runId===this.runId)),'Execute Run started before approval');
          if(confirmations===1&&action==='plan-reject'){await this.submit(e,{decision:'reject',reason:'修订：批准后只回复 '+replacement+'，不要再回复旧标记。'});return;}
          if(confirmations===1&&action==='plan-steer'){await this.steer('变更计划：批准后只回复 '+replacement+'，不要执行旧计划；提交新的 finalize_planning 等待确认。');await this.stale(e);return;}
          if(confirmations===2)check(e.awaitingId!==first?.awaitingId,'Revised plan reused old awaiting ID');
          approved=true;await this.submit(e,{decision:'approve'});
        });
        assertCompleted(result.events);check(approved,'Plan never waited for approval');
        check(confirmations===(action==='plan-approve'?1:2),'Unexpected planning revision count');
        if(action==='plan-steer')check(result.events.some(e=>e.type==='planning.superseded'),'Missing planning.superseded event');
        const detail=await this.idle(d=>(!!d.activeRun&&obj(d.activeRun).runId!==result.runId)||(Array.isArray(d.runs)&&d.runs.some(r=>obj(r).runId!==result.runId)));
        const executionId=str(detail.activeRun?obj(detail.activeRun).runId:detail.lastRunId);check(executionId!==result.runId,'Approved plan did not start separate execute Run');
        const events=await this.host.client.attach(executionId,this.agentKey);assertCompleted(events);
        this.record('批准后独立执行 Run',{runId:executionId,events,text:assistantText(events)});
        check(assistantText(events).includes(action==='plan-approve'?marker:replacement),'Execution used stale or missing plan');
        const rows=await this.host.client.raw('/api/chat/jsonl?chatId='+this.chatId);
        const lines=rows.text.trim().split('\n').map(x=>obj(JSON.parse(x)));
        check(lines.some(r=>r._type==='query'&&r.runId===executionId&&r.planRunId===result.runId),'Execution lacks persisted planRunId linkage');return;
      }
      if(action==='question-resume'||action==='interrupt-question'){
        await this.requireTools(['ask_user_question']);let awaiting:Obj|undefined;
        const prompt='先调用 ask_user_question，只有一个 type=text 的问题，问我项目代号。用户回答后只回复该回答。不要猜测，不用其他工具。';
        const result=await this.stream(prompt,{},async e=>{if(e.type==='awaiting.ask'){check(!awaiting,'Unexpected repeated question');awaiting=e;await this.idle(d=>!!d.awaiting);this.record('确认工具暂停并等待回答',{awaiting:e});if(action==='interrupt-question')await this.interrupt();else await this.question(e,marker);}});
        check(awaiting,'Question tool never paused');
        if(action==='question-resume'){assertCompleted(result.events);check(result.text.includes(marker),'Question answer not consumed');check(result.events.some(e=>e.type==='awaiting.answer'),'No awaiting.answer after submit');}
        else{this.canceled(result.events);await this.stale(awaiting);await this.idle(d=>d.canContinue===true&&!d.activeRun);const next=await this.complete('项目代号是 '+marker+'。无需再提问，直接回复该代号。');check(next.runId!==result.runId&&next.text.includes(marker),'Interrupted question could not continue');}
        return;
      }
      if(action==='interrupt-output'||action==='interrupt-wait'){
        if(action==='interrupt-wait')await this.requireTools(['wait']);let interrupted=false;
        const result=await this.stream(action==='interrupt-wait'?this.waitPrompt(marker):'记住标记 '+marker+'。先输出200条带序号的测试建议，最后输出该标记。不使用工具；如果被中断后收到继续指令，立刻仅回复此标记，不要重写清单。',{},async e=>{
          if(e.type==='awaiting.ask')throw new Error('Unexpected HITL');
          if(!interrupted&&e.type===(action==='interrupt-wait'?'tool.wait':'content.delta')){interrupted=true;await this.interrupt();}
        });
        check(interrupted,'Expected active output/tool wait was not observed');this.canceled(result.events);
        await this.idle(d=>d.canContinue===true&&!d.activeRun);
        this.record('取消终态允许空 query 续跑',{previousRunId:result.runId});
        const next=await this.complete('');check(next.runId!==result.runId,'Continuation must create a new Run');
        check(next.text.includes(marker),'Continuation lost original context');
        const detail=await this.detail();check(arr(detail.runs).length===2,'Continuation duplicated or lost a Run');return;
      }
      throw new Error('Unknown workflow '+action);
    } finally {
      // Cancellation or failed assertions must not leave synthetic HITL/wait alive.
      if(this.runId){try{const d=await this.detail();if(d.activeRun){this.runId=str(obj(d.activeRun).runId);await this.interrupt();}}catch(error){this.record('流程收尾检查',{error:String(error)});}}
    }
  }
}
