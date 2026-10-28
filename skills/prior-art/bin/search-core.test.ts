import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchPages, sourcegraph, parseSourcegraph, rank, licenseClass, overall, packages, answers, docs, enrich } from './search-core.ts';
import type { Transport, Reply } from './search-core.ts';
const bounds={pages:3,retries:0,timeoutMs:10};
const repo=(n=0)=>({full_name:`owner/r${n}`,html_url:`https://github.com/owner/r${n}`,stargazers_count:n,forks_count:0,description:'expense receipts',topics:[],license:{spdx_id:'MIT'},pushed_at:'2026-09-01T00:00:00Z'});
const ok=(data:unknown,headers={})=>({status:200,body:JSON.stringify(data),headers});
function sequence(replies:Reply[]):Transport{let i=0;return async()=>{assert.ok(i<replies.length,'unexpected page/retry');return replies[i++];};}
test('successful empty differs from failed request',async()=>{
 const empty=await searchPages('github','expense','repos',bounds,sequence([ok({items:[],total_count:0})]));assert.equal(empty.coverage.status,'complete');assert.equal(empty.coverage.retrieved,0);
 const fail=await searchPages('github','expense','repos',bounds,sequence([{status:401,body:'SECRET',headers:{}}]));assert.equal(fail.coverage.status,'failed');assert.equal(fail.coverage.error,'HTTP 401');assert.ok(!JSON.stringify(fail).includes('SECRET'));
});
test('pagination preserves all pages and first-page results on timeout',async()=>{
 const items=Array.from({length:100},(_,i)=>repo(i));
 const full=await searchPages('github','expense','repos',bounds,sequence([ok({items,total_count:101}),ok({items:[repo(101)],total_count:101})]));assert.equal(full.rows.length,101);assert.equal(full.coverage.pages,2);assert.equal(full.coverage.status,'complete');
 const partial=await searchPages('github','expense','repos',bounds,sequence([ok({items,total_count:101}),{status:0,body:'',headers:{},error:'request timeout'}]));assert.equal(partial.rows.length,100);assert.equal(partial.coverage.status,'partial');
});
test('page ceiling is explicitly partial',async()=>{
 const r=await searchPages('github','expense','repos',{...bounds,pages:1},sequence([ok({items:Array.from({length:100},(_,i)=>repo(i)),total_count:200})]));assert.equal(r.coverage.status,'partial');assert.match(r.coverage.error!,/budget/);
});
test('GitHub incomplete_results never complete even empty',async()=>{
 const r=await searchPages('github','expense','repos',bounds,sequence([ok({items:[],total_count:0,incomplete_results:true})]));assert.equal(r.coverage.status,'partial');assert.equal(r.coverage.incomplete,true);
});
test('provider errors cannot become valid empty',async()=>{
 for(const body of [{message:'rate limited'},{items:'wrong'},{items:[{}]}]){const r=await searchPages('github','x','repos',bounds,sequence([ok(body)]));assert.equal(r.coverage.status,'failed');}
});
test('retry is bounded and can recover',async()=>{
 const r=await searchPages('github','x','repos',{...bounds,retries:1},sequence([{status:503,body:'',headers:{}},ok({items:[],total_count:0})]));assert.equal(r.coverage.status,'complete');
});
test('GitLab header pagination and no host-scaled stars',async()=>{
 const first=ok([{path_with_namespace:'owner/repo',web_url:'https://gitlab.com/owner/repo',star_count:0}],{'x-total':'2','x-next-page':'2'});
 const second=ok([{path_with_namespace:'owner/repo2',web_url:'https://gitlab.com/owner/repo2',star_count:1}],{'x-total':'2','x-next-page':''});
 const r=await searchPages('gitlab','expense','repos',bounds,sequence([first,second]));assert.equal(r.rows[0].stars,0);assert.equal(r.coverage.pages,2);assert.equal(r.coverage.status,'complete');
});
test('topic-only query is honest skipped on non-GitHub hosts',async()=>{const r=await searchPages('gitlab','topic:expenses','repos',bounds,async()=>{throw Error('must not fetch');});assert.equal(r.coverage.status,'skipped');});
test('dedup includes host and zero stars have finite score',()=>{
 const base={full_name:'owner/repo',stars:0,forks:0,description:'expense receipts',topics:[],license:'MIT',pushed_at:'2026-09-01'};
 const rows=rank([{...base,host:'github'},{...base,host:'github.com'},{...base,host:'gitlab'}],'expense|receipts',new Date('2026-09-19'));assert.equal(rows.length,2);assert.ok(rows.every(r=>Number.isFinite(r.score)));assert.equal(rows[0].score,rows[1].score);
});
test('MPL is weak copyleft; research ranking is license-neutral',()=>{
 assert.equal(licenseClass('MPL-2.0'),'weak-copyleft');assert.equal(licenseClass('LGPL-3.0-only'),'weak-copyleft');assert.equal(licenseClass('AGPL-3.0'),'copyleft');
 const rows=rank(['MIT','MPL-2.0','AGPL-3.0','NONE'].map((license,i)=>({full_name:`owner/r${i}`,host:'github',stars:0,forks:0,license,topics:[],description:'expenses'})),'expenses');assert.equal(new Set(rows.map(r=>r.score)).size,1);
});
const matches='event: matches\ndata: '+JSON.stringify([{type:'content',repository:'github.com/owner/repo',path:'schema.ts',lineMatches:[{lineNumber:0,line:'amount: integer'}]}])+'\n\n';
const progress=(done:boolean,skipped:unknown[]=[])=>'event: progress\ndata: '+JSON.stringify({done,matchCount:1,skipped})+'\n\n';
test('Sourcegraph preserves partial streamed matches on timeout',async()=>{const r=await sourcegraph('amount',bounds,sequence([{status:200,body:matches,headers:{},truncated:true,error:'request timeout'}]));assert.equal(r.coverage.status,'partial');assert.equal(r.rows[0].line,1);assert.equal(r.rows[0].host,'github.com');assert.equal(r.rows[0].repo,'owner/repo');});
test('Sourcegraph missing final event is partial not complete',async()=>{const r=await sourcegraph('amount',bounds,sequence([{status:200,body:matches,headers:{}}]));assert.equal(r.coverage.status,'partial');});
test('Sourcegraph successful empty and skipped limits',async()=>{
 const empty=await sourcegraph('amount',bounds,sequence([{status:200,body:'event: progress\ndata: {"done":true,"matchCount":0}\n\n',headers:{}}]));assert.equal(empty.coverage.status,'complete');assert.equal(empty.rows.length,0);
 const parsed=parseSourcegraph(matches+progress(true,[{reason:'shard-match-limit'}]));assert.equal(parsed.incomplete,true);
 assert.equal(parseSourcegraph(matches+progress(true,[{reason:'repository-fork'}])).incomplete,false);
});
test('coverage overall never disguises failure as no results',()=>{const c={provider:'x',query:'x',pages:0,total:null,incomplete:false,retrieved:0,error:null} as const;assert.equal(overall([{...c,status:'complete'},{...c,status:'failed'}]),'partial');assert.equal(overall([{...c,status:'failed'}]),'failed');});
test('Codeberg failed body cannot be mistaken for successful empty',async()=>{const r=await searchPages('codeberg','x','repos',bounds,sequence([ok({ok:false,data:[]})]));assert.equal(r.coverage.status,'failed');});
test('GitHub body missing totals is malformed',async()=>{const r=await searchPages('github','x','repos',bounds,sequence([ok({items:[]})]));assert.equal(r.coverage.status,'failed');});
test('Sourcegraph done with timeout and zero records remains partial',async()=>{const r=await sourcegraph('amount',bounds,sequence([{status:200,body:progress(true,[{reason:'timeout'}]),headers:{}}]));assert.equal(r.coverage.status,'partial');});
test('Codeberg server page cap50 respects x-total-count and Link',async()=>{
 const items=Array.from({length:50},(_,i)=>({...repo(i),stars_count:0}));
 const r=await searchPages('codeberg','x','repos',{...bounds,pages:1},sequence([ok({data:items},{'x-total-count':'200',link:'<https://codeberg.org/api/v1/repos/search?page=2>; rel="next"'})]));assert.equal(r.coverage.status,'partial');assert.equal(r.coverage.total,200);assert.equal(r.coverage.incomplete,true);
});
test('unknown server page size requires empty terminal page',async()=>{
 const r=await searchPages('codeberg','x','repos',bounds,sequence([ok({data:[repo()]}),ok({data:[]})]));assert.equal(r.coverage.status,'complete');assert.equal(r.coverage.pages,2);
});
test('malformed Sourcegraph events cannot crash or look complete',async()=>{
 for(const body of ['event: progress\ndata: null\n\n','event: matches\ndata: [null]\n\n','event: matches\ndata: {}\n\n']){
  const r=await sourcegraph('x',bounds,sequence([{status:200,body,headers:{}}]));assert.equal(r.coverage.status,'failed');assert.ok(r.coverage.error);
 }
});
test('repeated pages fail completeness instead of counting duplicates as coverage',async()=>{
 const items=Array.from({length:100},(_,i)=>repo(i));const r=await searchPages('github','x','repos',bounds,sequence([ok({items,total_count:200}),ok({items,total_count:200})]));assert.equal(r.coverage.status,'partial');assert.match(r.coverage.error!,/Duplicate/);
});
test('changed totals during pagination are partial',async()=>{
 const r=await searchPages('github','x','repos',bounds,sequence([ok({items:Array.from({length:100},(_,i)=>repo(i)),total_count:200}),ok({items:[repo(101)],total_count:101})]));assert.equal(r.coverage.status,'partial');assert.equal(r.coverage.total,200);
});
test('terminal pagination inconsistent with known total is partial',async()=>{const r=await searchPages('gitlab','x','repos',bounds,sequence([ok([{path_with_namespace:'o/r'}],{'x-total':'200','x-next-page':''})]));assert.equal(r.coverage.status,'partial');});
test('GitHub public scope is enforced and private results discarded',async()=>{
 const r=await searchPages('github','x','repos',bounds,async request=>{assert.ok(request.url.includes('is%3Apublic'));return ok({items:[{...repo(),private:true}],total_count:1});});assert.equal(r.coverage.status,'failed');assert.equal(r.rows.length,0);
 const privateQuery=await searchPages('github','is:private','repos',bounds,async()=>{throw Error('must not fetch');});assert.equal(privateQuery.coverage.status,'failed');
});
test('legacy GitHub code query avoids unsupported public qualifier and filters visibility',async()=>{
 const r=await searchPages('github','money filename:schema.prisma','code',bounds,async request=>{assert.ok(!request.url.includes('is%3Apublic'));return ok({items:[{repository:{full_name:'o/public',private:false},path:'schema.prisma'},{repository:{full_name:'o/SECRET',private:true},path:'private.ts'}],total_count:2});});assert.equal(r.coverage.status,'partial');assert.equal(r.rows.length,1);assert.equal(r.rows[0].repo,'o/public');assert.ok(!JSON.stringify(r).includes('SECRET'));
});
const pkg=(n=0)=>({name:`p${n}`,ecosystem:'npm',dependent_repos_count:n,normalized_licenses:['MIT'],repository_url:`https://github.com/o/p${n}`});
const next='<https://packages.ecosyste.ms/api/v1/keywords/x?page=2>; rel="next"';
test('packages follow Link pagination to completion and keep unknown counts unknown',async()=>{
 const r=await packages('Recurrence',bounds,sequence([ok({packages:[pkg(1),{name:'q',ecosystem:'pypi'}]},{link:next}),ok({packages:[pkg(2)]},{link:'<x>; rel="first"'})]));
 assert.equal(r.coverage.status,'complete');assert.equal(r.coverage.pages,2);assert.equal(r.rows.length,3);assert.equal(r.rows[1].dependent_repos,null);assert.equal(r.rows[0].license,'MIT');
});
test('packages budget, 404 and malformed bodies are never complete',async()=>{
 const budget=await packages('x',{...bounds,pages:1},sequence([ok({packages:[pkg()]},{link:next})]));assert.equal(budget.coverage.status,'partial');assert.match(budget.coverage.error!,/budget/);
 const missing=await packages('x',bounds,sequence([{status:404,body:'{"error":"not found"}',headers:{}}]));assert.equal(missing.coverage.status,'failed');assert.match(missing.coverage.error!,/not evidence of absence/);
 for(const body of [{packages:'x'},{packages:[{name:'a'}]},{error:'x'}]){const r=await packages('x',bounds,sequence([ok(body)]));assert.equal(r.coverage.status,'failed');}
 const short=await packages('x',bounds,sequence([ok({packages:[pkg()]}),ok({packages:[]})]));assert.equal(short.coverage.pages,2);assert.equal(short.coverage.status,'complete');
 const full=await packages('x',bounds,sequence([ok({packages:Array.from({length:100},(_,i)=>pkg(i))}),ok({packages:[]})]));assert.equal(full.coverage.status,'complete');assert.equal(full.coverage.pages,2);
 const empty=await packages(' ',bounds,async()=>{throw Error('must not fetch');});assert.equal(empty.coverage.status,'skipped');
});
const question=(id:number)=>({question_id:id,link:`https://stackoverflow.com/q/${id}`,title:'DST &amp; &#39;rrule&#39;',score:5,answer_count:2,accepted_answer_id:9,tags:['rrule'],last_activity_date:1374530000,content_license:'CC BY-SA 3.0'});
test('answers complete on has_more false and decode titles',async()=>{
 const r=await answers('rrule','stackoverflow',bounds,sequence([ok({items:[question(1)],has_more:true}),ok({items:[question(2)],has_more:false})]),'');
 assert.equal(r.coverage.status,'complete');assert.equal(r.rows.length,2);assert.equal(r.rows[0].title,"DST & 'rrule'");assert.equal(r.rows[0].accepted,true);assert.equal(r.rows[0].last_activity,'2013-07-22');
});
test('answers backoff, quota, provider errors and missing has_more are not complete',async()=>{
 const back=await answers('x','stackoverflow',bounds,sequence([ok({items:[question(1)],has_more:true,backoff:10})]),'');assert.equal(back.coverage.status,'partial');assert.match(back.coverage.error!,/backoff/);
 const quota=await answers('x','stackoverflow',bounds,sequence([ok({items:[question(1)],has_more:true,quota_remaining:0})]),'');assert.match(quota.coverage.error!,/quota/);
 const throttled=await answers('x','stackoverflow',bounds,sequence([{status:400,body:'{"error_id":502}',headers:{}}]),'');assert.equal(throttled.coverage.status,'failed');
 const errBody=await answers('x','stackoverflow',bounds,sequence([ok({error_id:403,error_name:'access_denied'})]),'');assert.equal(errBody.coverage.status,'failed');
 const schema=await answers('x','stackoverflow',bounds,sequence([ok({items:[question(1)]})]),'');assert.equal(schema.coverage.status,'failed');
});
test('answers key is sent only when provided',async()=>{
 await answers('x','stackoverflow',bounds,async req=>{assert.ok(req.url.includes('key=public'));return ok({items:[],has_more:false});},'public');
 await answers('x','stackoverflow',bounds,async req=>{assert.ok(!req.url.includes('key='));return ok({items:[],has_more:false});},'');
});
test('docs read one ranked page and reject malformed ids',async()=>{
 const r=await docs('rrule',bounds,sequence([ok({results:[{id:'/jkbrzt/rrule',title:'RRule.js',trustScore:9,totalSnippets:40,lastUpdateDate:'2026-06-24T02:36:28Z'}]})]));
 assert.equal(r.coverage.status,'partial');assert.equal(r.coverage.total,null);assert.equal(r.rows[0].fetch,'https://context7.com/api/v1/jkbrzt/rrule?type=txt&tokens=5000');assert.equal(r.rows[0].updated,'2026-06-24');
 for(const body of [{results:[{id:'no-slash'}]},{results:null},{}]){const bad=await docs('x',bounds,sequence([ok(body)]));assert.equal(bad.coverage.status,'failed');}
 const down=await docs('x',bounds,sequence([{status:503,body:'',headers:{}}]));assert.equal(down.coverage.status,'failed');assert.equal(down.coverage.incomplete,true);
});
test('deps.dev enrichment: 404 is unknown, failures are partial, non-GitHub rows skipped',async()=>{
 const rows=[{full_name:'o/a',host:'github'},{full_name:'o/b',host:'gitlab'},{full_name:'o/c',host:'github.com'}];
 const c=await enrich(rows,5,bounds,async req=>req.url.endsWith('o%2Fa')?ok({projectKey:{id:'github.com/o/a'},scorecard:{overallScore:6.2}}):{status:404,body:'',headers:{}});
 assert.equal(c!.status,'complete');assert.equal(rows[0].scorecard,6.2);assert.equal(rows[2].scorecard,null);assert.equal((rows[1] as any).scorecard,undefined);
 const fail=await enrich([{full_name:'o/a',host:'github'},{full_name:'o/c',host:'github'}],5,bounds,sequence([ok({projectKey:{id:'x'}}),{status:500,body:'',headers:{}}]));assert.equal(fail!.status,'partial');
 assert.equal(await enrich([{full_name:'o/b',host:'gitlab'}],5,bounds,async()=>{throw Error('must not fetch');}),null);
});
test('packages keep paging past unstable order but never claim complete',async()=>{
 const r=await packages('x',bounds,sequence([ok({packages:[pkg(1),pkg(2)]},{link:next}),ok({packages:[pkg(2),pkg(3)]},{link:'<x>; rel="first"'})]));
 assert.equal(r.coverage.pages,2);assert.equal(r.rows.length,3);assert.equal(r.coverage.status,'partial');assert.match(r.coverage.error!,/unstable/);
});
test('malformed dates become unknown instead of crashing',async()=>{
 const a=await answers('x','stackoverflow',bounds,sequence([ok({items:[{...question(1),last_activity_date:1e20,creation_date:'x'}],has_more:false})]),'');assert.equal(a.rows[0].last_activity,null);assert.equal(a.rows[0].created,null);
 const p=await packages('x',bounds,sequence([ok({packages:[{...pkg(),latest_release_published_at:5}]},{link:'<x>; rel="first"'})]));assert.equal(p.rows[0].latest_release,null);
});
test('failed scorecard lookups render unknown, not unenriched',async()=>{const rows:any[]=[{full_name:'o/a',host:'github'}];await enrich(rows,1,bounds,sequence([{status:500,body:'',headers:{}}]));assert.equal(rows[0].scorecard,null);});
