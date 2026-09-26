// Future rerun helper, hardened AFTER the archived runs. See README for actual run controls.
// Explicit opt-in behavioral pilot. Uses Claude CLI; never run from offline CI.
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

if (!process.argv.includes('--run')) throw new Error('Pass --run to authorize six Claude sessions (up to $3 CLI budget total).');
const dir = fileURLToPath(new URL('.', import.meta.url));
const output = join(dir, 'runs.json');
if (existsSync(output)) throw new Error('Existing run evidence is immutable; use a separate pilot directory.');
const tasks = JSON.parse(readFileSync(join(dir, 'tasks.json'), 'utf8')) as {id:string;prompt:string}[];
const cwd = mkdtempSync(join(tmpdir(), 'prior-art-outcome-pilot-'));
const sha = (text:string) => createHash('sha256').update(text).digest('hex');
const common = 'You are evaluating a research instruction bundle. Use only the supplied fictional evidence. No tools exist. Return a useful concise answer, at most 550 words. Do not claim execution.\n\n';
const runs: object[] = [];
for (const [index, task] of tasks.entries()) {
  for (const arm of index % 2 ? ['candidate','baseline'] : ['baseline','candidate']) {
    const instructions = readFileSync(join(dir, `${arm}-instructions.md`), 'utf8');
    const started = Date.now();
    const args = ['--safe-mode','-p','--output-format','json','--tools','','--strict-mcp-config','--mcp-config','{"mcpServers":{}}','--disable-slash-commands','--setting-sources','','--settings','{"disableAllHooks":true}','--no-session-persistence','--effort','medium','--max-budget-usd','0.50','--system-prompt',common+instructions];
    const result = await new Promise<{code:number|null;stdout:string;stderr:string;timedOut:boolean}>((resolve) => {
      const child = spawn('claude',args,{cwd,stdio:['pipe','pipe','pipe']});
      let stdout='',stderr='',timedOut=false;
      let force:ReturnType<typeof setTimeout>|undefined;
      const timer = setTimeout(()=>{timedOut=true;child.kill('SIGTERM');force=setTimeout(()=>child.kill('SIGKILL'),2000);},90000);
      child.stdout.on('data',c=>stdout+=c.toString()); child.stderr.on('data',c=>stderr+=c.toString());
      child.on('error',()=>{clearTimeout(timer);if(force)clearTimeout(force);resolve({code:null,stdout,stderr:'spawn-failed',timedOut});});
      child.on('close',code=>{clearTimeout(timer);if(force)clearTimeout(force);resolve({code,stdout,stderr,timedOut});});
      child.stdin.end(task.prompt);
    });
    let response:Record<string,unknown> = {};
    try { response = JSON.parse(result.stdout); } catch { /* failure remains explicit */ }
    const models = Object.keys((response.modelUsage ?? {}) as object);
    runs.push({task_id:task.id,arm,task_sha256:sha(task.prompt),instructions_sha256:sha(common+instructions),elapsed_seconds:(Date.now()-started)/1000,failure:result.stderr==='spawn-failed'?'spawn-failed':result.timedOut?'timeout':result.code!==0?'process-failed':!response.result?'missing-answer':null,exit_code:result.code,timed_out:result.timedOut,subtype:response.subtype??null,models,cost_usd:response.total_cost_usd??null,answer:response.result??null,usage:response.usage??null,human_review:null});
    // Incremental evidence survives later failures; omit machine/session identifiers.
    writeFileSync(output,JSON.stringify(runs,null,2)+'\n');
    console.log(`${task.id} ${arm}: ${response.subtype ?? 'unparsed failure'} (${result.code})`);
    if (result.timedOut || result.code!==0 || !response.result) throw new Error('Pilot stopped on failure; partial evidence retained.');
  }
}
