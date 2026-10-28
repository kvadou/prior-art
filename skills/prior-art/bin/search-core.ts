import { execFile } from 'node:child_process';

export type Coverage = { provider: string; query: string; status: 'complete'|'partial'|'failed'|'skipped'; pages: number; total: number|null; incomplete: boolean; retrieved: number; error: string|null };
export type Reply = { status: number; body: string; headers: Record<string,string>; error?: string; truncated?: boolean };
export type Request = { provider: string; url: string; timeoutMs: number };
export type Transport = (request: Request) => Promise<Reply>;
export type Bounds = { pages: number; retries: number; timeoutMs: number };
export type Row = Record<string, any>;
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Never expose provider stderr or headers: they may contain authentication material.
export const transport: Transport = async ({provider,url,timeoutMs}) => {
 if (provider==='github') return new Promise(resolve => {
  execFile('gh',['api','--hostname','github.com','-X','GET',url],{timeout:timeoutMs,maxBuffer:16*1024*1024},(err,stdout)=>{
   if (err) resolve({status:0,body:'',headers:{},error:err.killed?'request timeout':'GitHub CLI request failed (check authentication and rate limits)'});
   else resolve({status:200,body:stdout,headers:{}});
  });
 });
 const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),timeoutMs);
 let body=''; let status=0; let headers:Record<string,string>={};
 try {
  const response=await fetch(url,{signal:controller.signal,headers:{Accept:provider==='sourcegraph'?'text/event-stream':'application/json'}});
  status=response.status;
  for(const key of ['x-total','x-total-count','x-next-page','link']) if(response.headers.has(key)) headers[key]=response.headers.get(key)!;
  const reader=response.body?.getReader(); const decoder=new TextDecoder();
  if(reader) for(;;){const chunk=await reader.read(); if(chunk.done) break; body+=decoder.decode(chunk.value,{stream:true}); if(body.length>16*1024*1024){controller.abort();return {status,body,headers,error:'response size limit',truncated:true};}}
  return {status,body,headers};
 } catch { return {status,body,headers,error:controller.signal.aborted?'request timeout':'network request failed',truncated:body.length>0}; }
 finally {clearTimeout(timer);}
};

async function request(request:Request,bounds:Bounds,fetcher:Transport):Promise<Reply>{
 let result:Reply={status:0,body:'',headers:{},error:'request failed'};
 for(let attempt=0;attempt<=bounds.retries;attempt++){
  try {result=await fetcher(request);} catch {result={status:0,body:'',headers:{},error:'request failed'};}
  if(result.body && result.truncated) return result;
  if(!result.error && result.status>=200 && result.status<300) return result;
  if(result.status>=400 && result.status<500 && result.status!==429) return {...result,error:`HTTP ${result.status}`};
  if(attempt<bounds.retries) await pause(Math.min(250*2**attempt,1000));
 }
 return {...result,error:result.error??`HTTP ${result.status}`};
}
export function plainQuery(q:string){return q.replace(/\b(?:topic|language|org|user|in|stars|forks|is|archived):(?:"[^"]*"|\S+)/g,'').trim().replace(/\s+/g,' ');}
export function licenseClass(license:string){
 if(/^(MPL|LGPL|EPL|CDDL)(-|$)/i.test(license)) return 'weak-copyleft';
 if(/^(AGPL|GPL)(-|$)/i.test(license)) return 'copyleft';
 if(/^(MIT|Apache-2.0|BSD-2-Clause|BSD-3-Clause|ISC|Unlicense|0BSD)$/i.test(license)) return 'permissive';
 return 'unknown-or-none';
}
export function hostName(host:string){return ({github:'github.com',gitlab:'gitlab.com',codeberg:'codeberg.org'} as Record<string,string>)[host]??host.toLowerCase();}
export function deduplicate(rows:Row[],key:(r:Row)=>string){return [...new Map(rows.map(r=>[key(r),r])).values()];}
export function rank(rows:Row[],keywords:string,now=new Date()):Row[]{
 const words=[...new Set(keywords.toLowerCase().split('|').map(s=>s.trim()).filter(Boolean))];
 const cutoff=new Date(now); cutoff.setUTCMonth(cutoff.getUTCMonth()-18);
 return deduplicate(rows,r=>`${hostName(r.host)}/${r.full_name.toLowerCase()}`).map(r=>{
  const hay=`${r.full_name} ${r.description??''} ${(r.topics??[]).join(' ')}`.toLowerCase();
  const hits=words.filter(w=>hay.includes(w)).length;
  const maintained=!r.archived && new Date(r.pushed_at??0).getTime()>=cutoff.getTime();
  const relevant=hits>=Math.min(2,words.length) && words.length>0;
  // License suitability is metadata, never a research relevance multiplier.
  const score=Math.floor(Math.min(Math.log1p(r.stars),9.5)*8+Math.min(hits,4)*15+(relevant?0:-70)+(maintained?25:0)+Math.log1p(r.forks)*3);
  return {...r,maintained,hits,relevant,license_class:licenseClass(r.license),score};
 }).sort((a,b)=>b.score-a.score || `${a.host}/${a.full_name}`.localeCompare(`${b.host}/${b.full_name}`));
}
function normalRepo(provider:string,r:Row):Row{
 const count=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:0;
 return {full_name:r.full_name??r.path_with_namespace,html_url:r.html_url??r.web_url,description:r.description??null,
 stars:count(r.stargazers_count??r.star_count??r.stars_count),forks:count(r.forks_count),language:r.language??null,
 license:r.license?.spdx_id??r.license?.nickname??r.license?.key??'NONE',pushed_at:r.pushed_at??r.last_activity_at??r.updated_at??null,
 archived:!!r.archived,topics:Array.isArray(r.topics)?r.topics:[],host:provider};
}
export async function searchPages(provider:string,query:string,kind:'repos'|'code',bounds:Bounds,fetcher:Transport=transport):Promise<{rows:Row[];coverage:Coverage}>{
 const coverage:Coverage={provider,query,status:'failed',pages:0,total:null,incomplete:false,retrieved:0,error:null};const rows:Row[]=[];const seen=new Set<string>();
 const q=provider==='github'?(kind==='repos'?`${query} is:public`:query):plainQuery(query);
 if(provider==='github' && /\b(?:is|visibility):private\b/i.test(query)){coverage.error='Only public repository discovery is supported';return {rows,coverage};}
 if(!q){coverage.status='skipped';coverage.error='No portable search terms after removing unsupported qualifiers';return {rows,coverage};}
 let done=false;
 for(let page=1;page<=bounds.pages;page++){
  const params=new URLSearchParams(provider==='github'?{q,per_page:'100',page:String(page),...(kind==='repos'?{sort:'stars',order:'desc'}:{})}:provider==='gitlab'?{search:q,per_page:'100',page:String(page),visibility:'public',order_by:'star_count',sort:'desc'}:{q,limit:'100',page:String(page),sort:'stars',order:'desc'});
  const url=provider==='github'?`search/${kind==='repos'?'repositories':'code'}?${params}`:provider==='gitlab'?`https://gitlab.com/api/v4/projects?${params}`:`https://codeberg.org/api/v1/repos/search?${params}`;
  const response=await request({provider,url,timeoutMs:bounds.timeoutMs},bounds,fetcher);
  if(response.error || response.status<200 || response.status>=300){coverage.error=response.error??`HTTP ${response.status}`;break;}
  let body:any;try{body=JSON.parse(response.body);}catch{coverage.error='Invalid JSON response';break;}
  if ((provider==='github' && (!Number.isInteger(body?.total_count) || body.total_count<0)) || (provider==='codeberg' && body?.ok===false)){coverage.error='Unexpected provider response schema';break;}
  let items=provider==='github'?body.items:provider==='gitlab'?body:body?.data;
  if(!Array.isArray(items) || items.some(r=>!r || typeof r!=='object' || (kind==='repos' ? typeof(r.full_name??r.path_with_namespace)!=='string' : typeof r.repository?.full_name!=='string' || typeof r.path!=='string'))){coverage.error='Unexpected provider response schema';break;}
  if(provider==='github' && kind==='repos' && items.some(r=>r.private===true)){coverage.error='Provider returned a private repository; response discarded';break;}
  const retrieved=items.length;
  if(provider==='github' && kind==='code'){const publicItems=items.filter(r=>r.repository.private===false);if(publicItems.length!==items.length){coverage.incomplete=true;coverage.error='Private or unverified-visibility code hits omitted; provider total includes them';}items=publicItems;}
  coverage.pages++;coverage.retrieved+=retrieved;
  let pageError:string|null=null;
  for(const item of items){const key=String(kind==='repos'?(item.full_name??item.path_with_namespace):`${item.repository.full_name}/${item.path}`).toLowerCase();if(seen.has(key))pageError='Duplicate results across pages; search sample is unstable';seen.add(key);}
  const total=provider==='gitlab'?response.headers['x-total']:provider==='codeberg'?response.headers['x-total-count']??body.total_count:body.total_count;
  if(total!==undefined && total!==null && /^\d+$/.test(String(total)) && Number.isSafeInteger(Number(total))){if(coverage.total!==null&&coverage.total!==Number(total))pageError='Provider total changed during pagination';else coverage.total=Number(total);}
  coverage.incomplete ||= body.incomplete_results===true;
  rows.push(...items.map(r=>kind==='repos'?normalRepo(provider,r):{repo:r.repository.full_name,host:'github.com',path:r.path,stars:null,line:null,snippet:''}));
  if(pageError){coverage.error=pageError;break;}
  if(provider==='gitlab' && 'x-next-page' in response.headers) done=response.headers['x-next-page']==='';
  else if(response.headers.link) done=!/<[^>]+>;\s*rel=[\"']?next[\"']?/i.test(response.headers.link);
  else done=coverage.total!==null?coverage.retrieved>=coverage.total:items.length===0;
  if(done && coverage.total!==null && coverage.retrieved!==coverage.total){done=false;coverage.error='Pagination ended before reported total was retrieved';break;}
  if(done) break;
  if(provider==='github' && coverage.retrieved>=1000){coverage.error='GitHub search result ceiling reached';break;}
 }
 if(!done && !coverage.error) coverage.error='Pagination budget reached';
 coverage.incomplete ||= !done || !!coverage.error;
 coverage.status=coverage.pages===0?'failed':done&&!coverage.incomplete&&!coverage.error?'complete':'partial';
 return {rows,coverage};
}
export function parseSourcegraph(body:string):{rows:Row[];done:boolean;incomplete:boolean;error:string|null;total:number|null}{
 const rows:Row[]=[];let done=false,incomplete=false,error:string|null=null,total:number|null=null;
 for(const frame of body.replace(/\r\n/g,'\n').split('\n\n')){
  const event=frame.match(/^event:\s*(.+)$/m)?.[1];const text=frame.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trim()).join('\n');
  if(!event||!text) continue;
  let data:any;try{data=JSON.parse(text);}catch{error='Invalid event stream JSON';continue;}
  if(event==='matches' && !Array.isArray(data)){error='Invalid matches schema';incomplete=true;continue;}
  if(event==='matches' && Array.isArray(data)) for(const m of data){
   if(!m || typeof m!=='object'){error='Invalid match schema';incomplete=true;continue;}
   if(m.type!=='content')continue;
   if(typeof m.repository!=='string'||typeof m.path!=='string'){error='Invalid content match schema';incomplete=true;continue;}
   const [host,...repo]=m.repository.split('/');if(!repo.length)continue;
   const line=m.chunkMatches?.[0]?.contentStart?.line??m.lineMatches?.[0]?.lineNumber;
   rows.push({repo:repo.join('/'),host,path:m.path,stars:typeof m.repoStars==='number'?m.repoStars:null,line:typeof line==='number'?line+1:null,snippet:String(m.chunkMatches?.[0]?.content??m.lineMatches?.[0]?.line??'').replace(/\n/g,' ').slice(0,110)});
  }
  if(event==='progress'){
   if(!data || typeof data!=='object' || typeof data.done!=='boolean'){error='Invalid progress schema';incomplete=true;continue;}
   done ||= data.done===true;
   if(typeof data.matchCount==='number') total=data.matchCount;
   // Archived/forked exclusions are normal documented scope; limits/errors are incomplete evidence.
   const skipped=Array.isArray(data.skipped)?data.skipped:[];
   if(skipped.some((s:any)=>(!s || typeof s!=='object') || !['repository-fork','excluded-archive','excluded-fork','repository-archived'].includes(s.reason))){incomplete=true;error='Provider skipped results (limit, timeout, or unavailable repositories)';}
  }
  if(event==='error'){incomplete=true;error='Provider stream error';}
 }
 return {rows,done,incomplete,error,total};
}
export async function sourcegraph(query:string,bounds:Bounds,fetcher:Transport=transport){
 const response=await request({provider:'sourcegraph',url:`https://sourcegraph.com/.api/search/stream?${new URLSearchParams({q:`${query} count:${bounds.pages*100}`,display:String(bounds.pages*100)})}`,timeoutMs:bounds.timeoutMs},bounds,fetcher);
 const parsed=parseSourcegraph(response.status>=200&&response.status<300?response.body:'');
 const error=response.error??(response.status<200||response.status>=300?`HTTP ${response.status}`:parsed.error??(!parsed.done?'Stream ended without final progress':null));
 const coverage:Coverage={provider:'sourcegraph',query,status:!error&&parsed.done&&!parsed.incomplete?'complete':parsed.rows.length||parsed.done?'partial':'failed',pages:response.status===200?1:0,total:parsed.total,incomplete:parsed.incomplete||!!error,retrieved:parsed.rows.length,error};
 return {rows:parsed.rows,coverage};
}
export function overall(coverage:Coverage[]){return coverage.every(c=>c.status==='complete')?'complete':coverage.some(c=>c.status==='complete'||c.status==='partial')?'partial':'failed';}
const num=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
const nextLink=(link?:string)=>/<[^>]+>;\s*rel=["']?next["']?/i.test(link??'');
const fresh=(provider:string,query:string):Coverage=>({provider,query,status:'failed',pages:0,total:null,incomplete:false,retrieved:0,error:null});
function settle(coverage:Coverage,done:boolean):Coverage{
 if(!done&&!coverage.error) coverage.error='Pagination budget reached';
 coverage.incomplete ||= !done || !!coverage.error;
 coverage.status=coverage.pages===0?'failed':done&&!coverage.incomplete?'complete':'partial';
 return coverage;
}
const failure=(r:Reply)=>r.error||r.status<200||r.status>=300?(r.error??`HTTP ${r.status}`):null;
const entity:Record<string,string>={quot:'"','#39':"'",amp:'&',lt:'<',gt:'>'};
const day=(s:unknown)=>{const d=new Date(typeof s==='number'?s*1000:NaN);return Number.isNaN(d.getTime())?null:d.toISOString().slice(0,10);};

// ecosyste.ms keyword index across registries. Dependents measure use; stars do not.
export async function packages(keyword:string,bounds:Bounds,fetcher:Transport=transport):Promise<{rows:Row[];coverage:Coverage}>{
 const coverage=fresh('ecosyste.ms',keyword);const rows:Row[]=[];const seen=new Set<string>();let done=false,unstable=false;
 const kw=keyword.trim().toLowerCase();
 if(!kw){coverage.status='skipped';coverage.error='Empty keyword';return {rows,coverage};}
 for(let page=1;page<=bounds.pages;page++){
  const response=await request({provider:'ecosyste.ms',url:`https://packages.ecosyste.ms/api/v1/keywords/${encodeURIComponent(kw)}?${new URLSearchParams({per_page:'100',page:String(page)})}`,timeoutMs:bounds.timeoutMs},bounds,fetcher);
  const err=failure(response);if(err){coverage.error=response.status===404&&page===1?'HTTP 404 (keyword not indexed; not evidence of absence)':err;break;}
  let body:any;try{body=JSON.parse(response.body);}catch{coverage.error='Invalid JSON response';break;}
  const items=body?.packages;
  if(!Array.isArray(items)||items.some((p:any)=>!p||typeof p!=='object'||typeof p.name!=='string'||typeof p.ecosystem!=='string')){coverage.error='Unexpected provider response schema';break;}
  coverage.pages++;coverage.retrieved+=items.length;
  for(const p of items){
   const key=`${p.ecosystem}/${p.name}`.toLowerCase();if(seen.has(key)){unstable=true;continue;}seen.add(key);
   rows.push({name:p.name,ecosystem:p.ecosystem,description:p.description??null,repo:p.repository_url??null,registry_url:p.registry_url??null,
    dependent_repos:num(p.dependent_repos_count),dependent_packages:num(p.dependent_packages_count),downloads:num(p.downloads),downloads_period:p.downloads_period??null,
    latest_release:typeof p.latest_release_published_at==='string'?p.latest_release_published_at.slice(0,10):null,license:Array.isArray(p.normalized_licenses)&&p.normalized_licenses.length?p.normalized_licenses.join(' OR '):p.licenses??'unknown',status:p.status??null});
  }
  // Without a Link header, only an empty page proves the end.
  done=items.length===0||('link' in response.headers&&!nextLink(response.headers.link));
  if(done) break;
 }
 // Provider page order is not stable: keep paging, but a repeat means another row may have been skipped.
 if(unstable&&!coverage.error) coverage.error='Duplicate results across pages; unstable provider order may have skipped rows';
 return {rows,coverage:settle(coverage,done)};
}

// Stack Exchange search, vote-sorted. Anonymous quota is 300/day; STACK_EXCHANGE_KEY (a public app key) raises it.
export async function answers(query:string,site:string,bounds:Bounds,fetcher:Transport=transport,key=process.env.STACK_EXCHANGE_KEY):Promise<{rows:Row[];coverage:Coverage}>{
 const coverage=fresh(site,query);const rows:Row[]=[];const seen=new Set<number>();let done=false;
 if(!query.trim()){coverage.status='skipped';coverage.error='Empty query';return {rows,coverage};}
 for(let page=1;page<=bounds.pages;page++){
  const params=new URLSearchParams({q:query,site,order:'desc',sort:'votes',pagesize:'100',page:String(page),...(key?{key}:{})});
  const response=await request({provider:'stackexchange',url:`https://api.stackexchange.com/2.3/search/advanced?${params}`,timeoutMs:bounds.timeoutMs},bounds,fetcher);
  const err=failure(response);if(err){coverage.error=err;break;}
  let body:any;try{body=JSON.parse(response.body);}catch{coverage.error='Invalid JSON response';break;}
  if(typeof body?.error_id==='number'){coverage.error=`Provider error ${body.error_id}`;break;}
  const items=body?.items;
  if(!Array.isArray(items)||typeof body.has_more!=='boolean'||items.some((q:any)=>!q||typeof q!=='object'||typeof q.question_id!=='number'||typeof q.link!=='string'||typeof q.title!=='string')){coverage.error='Unexpected provider response schema';break;}
  coverage.pages++;coverage.retrieved+=items.length;
  let duplicate=false;
  for(const q of items){
   if(seen.has(q.question_id))duplicate=true;seen.add(q.question_id);
   rows.push({title:q.title.replace(/&(quot|#39|amp|lt|gt);/g,(_:string,e:string)=>entity[e]),link:q.link,site,score:typeof q.score==='number'?q.score:null,answers:num(q.answer_count),
    accepted:typeof q.accepted_answer_id==='number',tags:Array.isArray(q.tags)?q.tags:[],last_activity:day(q.last_activity_date),created:day(q.creation_date),license:q.content_license??'unknown'});
  }
  if(duplicate){coverage.error='Duplicate results across pages; search sample is unstable';break;}
  done=!body.has_more;
  if(done) break;
  if(typeof body.backoff==='number'){coverage.error=`Provider requested ${body.backoff}s backoff`;break;}
  if(body.quota_remaining===0){coverage.error='Daily quota exhausted (set STACK_EXCHANGE_KEY)';break;}
 }
 return {rows,coverage:settle(coverage,done)};
}

// Context7 library discovery: one capped, relevance-ranked page with no total, so never complete.
export async function docs(query:string,bounds:Bounds,fetcher:Transport=transport):Promise<{rows:Row[];coverage:Coverage}>{
 const coverage=fresh('context7',query);coverage.incomplete=true;const rows:Row[]=[];
 if(!query.trim()){coverage.status='skipped';coverage.error='Empty query';return {rows,coverage};}
 const response=await request({provider:'context7',url:`https://context7.com/api/v1/search?${new URLSearchParams({query:query.trim()})}`,timeoutMs:bounds.timeoutMs},bounds,fetcher);
 const err=failure(response);if(err){coverage.error=err;return {rows,coverage};}
 let body:any;try{body=JSON.parse(response.body);}catch{coverage.error='Invalid JSON response';return {rows,coverage};}
 const items=body?.results;
 if(!Array.isArray(items)||items.some((r:any)=>!r||typeof r!=='object'||typeof r.id!=='string'||!r.id.startsWith('/'))){coverage.error='Unexpected provider response schema';return {rows,coverage};}
 coverage.pages=1;coverage.retrieved=items.length;coverage.status='partial';coverage.incomplete=true;coverage.error='Ranked top results only; provider reports no total';
 rows.push(...items.map((r:any)=>({id:r.id,title:r.title??r.id,description:r.description??null,trust:num(r.trustScore),snippets:num(r.totalSnippets),updated:typeof r.lastUpdateDate==='string'?r.lastUpdateDate.slice(0,10):null,
  fetch:`https://context7.com/api/v1${r.id.split('/').map(encodeURIComponent).join('/')}?type=txt&tokens=5000`})));
 return {rows,coverage};
}

// deps.dev project lookup for the top GitHub rows: OpenSSF Scorecard as a maintenance-practice signal.
export async function enrich(rows:Row[],n:number,bounds:Bounds,fetcher:Transport=transport):Promise<Coverage|null>{
 const targets=rows.filter(r=>hostName(r.host)==='github.com').slice(0,n);
 if(!targets.length) return null;
 const coverage=fresh('deps.dev',`scorecard: top ${targets.length} GitHub repos`);let failed=0;
 for(const r of targets){
  const response=await request({provider:'deps.dev',url:`https://api.deps.dev/v3/projects/${encodeURIComponent(`github.com/${r.full_name}`)}`,timeoutMs:bounds.timeoutMs},bounds,fetcher);
  coverage.pages++;
  if(response.status===404){r.scorecard=null;coverage.retrieved++;continue;} // not indexed: unknown, not a failure
  r.scorecard=null; // unknown unless the lookup succeeds
  if(failure(response)){failed++;continue;}
  let body:any;try{body=JSON.parse(response.body);}catch{failed++;continue;}
  if(typeof body?.projectKey?.id!=='string'){failed++;continue;}
  const s=body.scorecard?.overallScore;r.scorecard=typeof s==='number'&&s>=0&&s<=10?s:null;coverage.retrieved++;
 }
 coverage.total=targets.length;coverage.incomplete=failed>0;coverage.error=failed?`${failed} lookups failed; scorecard unknown for those rows`:null;
 coverage.status=failed===targets.length?'failed':failed?'partial':'complete';
 return coverage;
}
