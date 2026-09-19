import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { searchPages, sourcegraph, rank, overall, hostName, deduplicate } from './search-core.ts';
import type { Coverage, Row } from './search-core.ts';

async function main(){
const mode=process.argv[2];const args=process.argv.slice(3);const opts:Record<string,string>={};const positional:string[]=[];
const accepted=mode==='repos'?'nsokSprt':'noeqdlprt';
for(let i=0;i<args.length;i++){
 const a=args[i];if(a==='--'){positional.push(...args.slice(i+1));break;}
 if(!a.startsWith('-')){positional.push(a);continue;}
 if(!/^-[a-zA-Z]$/.test(a)||!accepted.includes(a[1]))throw new Error(`Unknown option: ${a}`);
 if(a==='-l'){opts.l='1';continue;}
 if(args[i+1]===undefined)throw new Error(`Missing value for ${a}`);opts[a[1]]=args[++i];
}
function int(name:string,fallback:number,min:number,max:number){const text=opts[name]??String(fallback);if(!/^\d+$/.test(text)||Number(text)<min||Number(text)>max)throw new Error(`-${name} must be ${min}..${max}`);return Number(text);}
const top=int('n',mode==='repos'?25:15,1,1000),minStars=int('s',0,0,10000000);
const bounds={pages:int('p',3,1,10),retries:int('r',2,0,4),timeoutMs:int('t',15,1,60)*1000};
const here=dirname(fileURLToPath(import.meta.url));
let root='';try{root=execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{}
const outdir=opts.o??process.env.PRIOR_ART_OUT??(root?join(root,'docs/prior-art'):join(homedir(),'.prior-art'));
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const coverage:Coverage[]=[];let rows:Row[]=[];let name='';let evidence:Record<string,string>={};
const esc=(s:unknown)=>String(s??'').replace(/\|/g,'\\|').replace(/[\r\n]/g,' ').replace(/</g,'&lt;');
let header='';let sections='';
if(mode==='repos'){
 if(!positional.length)throw new Error('Give at least one search query');
 const providers=[...new Set((opts.S??'github').split(','))];if(providers.some(p=>!['github','gitlab','codeberg'].includes(p)))throw new Error('Sources must be github,gitlab,codeberg');
 for(const query of positional)for(const provider of providers){
  console.error(`Searching ${provider}: ${query}`);
  const result=await searchPages(provider,query,'repos',bounds);coverage.push(result.coverage);rows.push(...result.rows.filter(r=>r.stars>=minStars));
 }
 const keywords=opts.k??positional.join(' ').toLowerCase().replace(/\b(?:topic|language|stars|org|user|in|is):/g,'').split(/[^a-z0-9-]+/).filter(w=>w&&!['the','a','an','and','or','for','with','of','to','open','source','system','app','tool','platform'].includes(w)).join('|');
 rows=rank(rows,keywords);name=`${stamp}`;
 header=`# Prior art survey, ${stamp}\n\nQueries: ${positional.map(esc).join('; ')} · Sources: ${providers.join(', ')}\n\nFilters: stars >= ${minStars} on every host; ${rows.length} unique retrieved repos. Research ranking is license-neutral; stars are a popularity signal, not quality evidence.\n`;
 sections='\n| # | Repo | Host | Stars | Lang | License | Maintained | Rel | Score |\n|---|------|------|-------|------|---------|-----------|-----|-------|\n'+rows.slice(0,top).map((r,i)=>`| ${i+1} | [${esc(r.full_name)}](${r.html_url}) | ${r.host} | ${r.stars} | ${esc(r.language??'-')} | ${esc(r.license)} (${r.license_class}) | ${r.maintained?'yes':'NO'} | ${r.relevant?'y':'n'} | ${r.score} |`).join('\n')+'\n\n## Candidates\n'+rows.slice(0,top).map(r=>`\n### ${esc(r.full_name)}\n\n${esc(r.description??'(no description)')}\n\n- ${r.html_url}\n- ${r.stars} stars, ${r.forks} forks; license ${esc(r.license)} (${r.license_class})\n- last activity ${esc(r.pushed_at??'unknown')}${r.archived?', ARCHIVED':''}\n- topics: ${r.topics.map(esc).join(', ')}\n`).join('');
}else if(mode==='patterns'){
 const library=(await readFile(join(here,'../references/patterns.tsv'),'utf8')).split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>{const [name,decision,engine,query,evidence]=l.split('\t');return {name,decision,engine,query,evidence};});
 if(opts.l){for(const r of library)console.log([r.name,r.decision,r.engine,r.evidence].join('\t'));process.exit(0);}
 if(opts.e&&!['sourcegraph','github'].includes(opts.e))throw new Error('Engine must be sourcegraph or github');
 const runs=opts.q?[{name:'adhoc',engine:opts.e??'sourcegraph',query:opts.q,evidence:'ad hoc query'}]:library.filter(r=>opts.d?r.decision===opts.d:r.name===positional[0]);
 if(!runs.length)throw new Error('Unknown pattern or decision (use -l)');
 name=`${stamp}-pattern-${(positional[0]??opts.d??'adhoc').replace(/[^a-zA-Z0-9_-]/g,'_')}`;
 for(const run of runs){const provider=opts.e??run.engine;evidence[run.name]=run.evidence;console.error(`[${provider}] ${run.name}: ${run.query}`);
  const result=provider==='sourcegraph'?await sourcegraph(run.query,bounds):await searchPages('github',run.query,'code',bounds);
  coverage.push({...result.coverage,query:`${run.name}: ${result.coverage.query}`});rows.push(...result.rows.map(r=>({...r,pattern:run.name,evidence:run.evidence})));
 }
 rows=Object.entries(evidence).map(([pattern,evidence])=>{
  const matches=rows.filter(r=>r.pattern===pattern);const repos=deduplicate(matches,r=>`${hostName(r.host)}/${r.repo.toLowerCase()}`).map(r=>({...r,files:new Set(matches.filter(m=>hostName(m.host)===hostName(r.host)&&m.repo.toLowerCase()===r.repo.toLowerCase()).map(m=>m.path)).size})).sort((a,b)=>(b.stars??-1)-(a.stars??-1)||`${a.host}/${a.repo}`.localeCompare(`${b.host}/${b.repo}`));
  return {pattern,evidence,repos};
 });
 header=`# Pattern search: ${esc(positional[0]??opts.d??'ad hoc')} (${stamp})\n`;
 sections=rows.map(r=>`\n## ${r.pattern}\n\nEvidence hypothesis: ${esc(r.evidence)}. Retrieved repositories: ${r.repos.length}.\n\n| Repo | Host | Stars | Files | Example | Snippet |\n|---|---|---|---|---|---|\n`+r.repos.slice(0,top).map((p:Row)=>`| ${esc(p.repo)} | ${esc(p.host)} | ${p.stars??'unknown'} | ${p.files} | ${esc(p.path)}${p.line!==null?':'+p.line:''} | ${esc(p.snippet)} |`).join('\n')).join('\n')+'\n\nMatches are discovery leads, not proof of convergence. Open source locations and validate semantics. Counts are retrieved samples unless coverage is complete. GitHub code search is authenticated and does not support the public qualifier: only hits explicitly marked public are retained; omitted private/unknown hits mark coverage partial. It does not supply stars or snippets; missing metadata stays unknown. Sourcegraph excludes forks/archives unless requested; its match total can count lines, whereas retrieved counts file records.\n';
}else throw new Error('Unknown search mode');
await mkdir(outdir,{recursive:true});const status=overall(coverage);
const manifest={version:1,status,bounds,queries:coverage};
const paths={report:join(outdir,`${name}${mode==='repos'?'-report':''}.md`),results:join(outdir,`${name}-results.json`),coverage:join(outdir,`${name}-coverage.json`)};
const coverageText=`\n## Search coverage: ${status}\n\n| Provider | Query | Status | Pages | Total reported | Retrieved | Incomplete | Error |\n|---|---|---|---|---|---|---|---|\n`+coverage.map(c=>`| ${c.provider} | ${esc(c.query)} | ${c.status} | ${c.pages} | ${c.total??'unknown'} | ${c.retrieved} | ${c.incomplete?'yes':'no'} | ${esc(c.error??'')} |`).join('\n')+'\n\nRetrieved counts precede local filters and deduplication. A failed or partial search is never evidence of absence. Provider completeness describes the query/API scope, not the entire software ecosystem.\n';
await Promise.all([writeFile(paths.results,JSON.stringify(rows,null,2)+'\n'),writeFile(paths.coverage,JSON.stringify(manifest,null,2)+'\n'),writeFile(paths.report,header+coverageText+sections)]);
console.log(paths.report);process.exitCode=status==='complete'?0:status==='partial'?2:1;

}
main().catch(()=>{console.error('Search failed: check arguments, output permissions, and Node version.');console.error('Usage: prior-art-search.sh [-n TOP -s STARS -o DIR -k WORDS -S HOSTS -p PAGES -t SECONDS -r RETRIES] query ...');console.error('       pattern-search.sh [-l | -d DECISION | -q QUERY | NAME] [-e ENGINE -n TOP -o DIR -p PAGES -t SECONDS -r RETRIES]');process.exitCode=2;});
