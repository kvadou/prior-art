import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Validates the linked tables of a research record: every conclusion cites
// evidence, and every adopted pattern stays open until a check of comparable
// authority has run. Unknown, failed and partial never aggregate to complete.

export const EVIDENCE_STATUS = [
  "read",
  "searched-no-relevant-result",
  "failed",
  "not-applicable",
] as const;
export const EVIDENCE_AUTHORITY = [
  "source",
  "contract",
  "standard",
  "history",
  "documentation",
  "observed-artifact",
  "observed-ui",
  "secondary",
] as const;
export const DECISION_STATUS = [
  "supported",
  "contested",
  "unknown",
  "not-found-in-surveyed-sources",
] as const;
export const QUESTION_STATUS = ["answered", "partial", "unresolved"] as const;
export const OBLIGATION_STATUS = ["open", "closed", "failed", "waived"] as const;
// Ordered: a check closes an obligation only at or above the required rung.
export const CHECK_AUTHORITY = [
  "inspection",
  "unit",
  "integration",
  "end-to-end",
  "production",
] as const;

type Row = { line: number; cells: Record<string, string> };
type Section = { line: number; rows: Row[] };
export type LintResult = {
  valid: boolean;
  research_complete: boolean;
  build_complete: boolean;
  errors: string[];
  warnings: string[];
  incomplete: string[];
  counts: {
    questions: Record<string, number>;
    evidence: Record<string, number>;
    decisions: Record<string, number>;
    obligations: Record<string, number>;
  };
};

const SECTIONS = {
  questions: {
    title: "questions",
    columns: ["id", "question", "status", "answer"],
  },
  evidence: {
    title: "evidence register",
    columns: ["id", "authority", "source", "status"],
  },
  decisions: {
    title: "decisions",
    columns: ["id", "decision", "status", "evidence"],
  },
  obligations: {
    title: "obligations",
    columns: [
      "id",
      "decision",
      "invariant",
      "required authority",
      "check",
      "verified authority",
      "result",
      "status",
    ],
  },
} as const;
type Key = keyof typeof SECTIONS;

function splitRow(line: string): string[] {
  const body = line.trim().replace(/^\|/, "").replace(/(?<!\\)\|$/, "");
  return body.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, "|"));
}
// Column names match on their first words so headers can carry a short gloss,
// for example "Source / revision / locator".
function columnKey(header: string): string {
  return header
    .toLowerCase()
    .replace(/[`*_]/g, "")
    .split(/\s*[/(]/)[0]
    .trim();
}
const blank = (value: string | undefined) =>
  !value || /^(-|\u2014|n\/a|none)?$/i.test(value.trim());
const ids = (value: string, prefix: string) =>
  [...value.matchAll(new RegExp(`\\b${prefix}\\d+\\b`, "g"))].map((m) => m[0]);

export function parseSections(markdown: string, errors: string[]) {
  const lines = markdown.split(/\r?\n/);
  const found: Partial<Record<Key, Section>> = {};
  let current: Key | null = null;
  let level = 0;
  let headers: string[] | null = null;
  let fence = false;
  lines.forEach((raw, index) => {
    const line = raw.trim();
    const number = index + 1;
    if (/^(```|~~~)/.test(line)) fence = !fence;
    if (fence) return;
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    if (heading) {
      headers = null;
      const title = heading[2].toLowerCase().replace(/[`*_]/g, "").trim();
      const key = (Object.keys(SECTIONS) as Key[]).find(
        (k) => title === SECTIONS[k].title,
      );
      if (key) {
        current = key;
        level = heading[1].length;
        if (found[key])
          errors.push(`line ${number}: duplicate "${heading[2]}" section`);
        else found[key] = { line: number, rows: [] };
      } else if (current && heading[1].length <= level) current = null;
      // A deeper sub-heading (### Phase 1) stays inside the section.
      return;
    }
    if (!line.startsWith("|")) {
      if (line) headers = null; // a table ends at any other text
      if (current && /^:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line))
        errors.push(
          `line ${number}: ${SECTIONS[current].title} tables need leading and trailing pipes`,
        );
      return;
    }
    const cells = splitRow(line);
    if (!current) {
      if (/^[QEDO]\d+$/.test(cells[0] ?? ""))
        errors.push(
          `line ${number}: row ${cells[0]} is outside a Questions, Evidence register, Decisions or Obligations section`,
        );
      return;
    }
    if (!headers) {
      headers = cells.map(columnKey);
      const missing = SECTIONS[current].columns.filter((c) => !headers!.includes(c));
      if (missing.length)
        errors.push(
          `line ${number}: ${SECTIONS[current].title} table missing column(s): ${missing.join(", ")}`,
        );
      return;
    }
    if (cells.every((c) => /^:?-{3,}:?$/.test(c))) return;
    const row: Record<string, string> = {};
    for (const c of SECTIONS[current].columns) row[c] = "";
    headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
    found[current]!.rows.push({ line: number, cells: row });
  });
  return found;
}

// Path-like tokens in a check cell: every backticked span, plus bare tokens with a
// slash. Accepts path, path:12, path#test name and path::test_name forms.
export function checkTargets(check: string) {
  const out: { path: string; name?: string }[] = [];
  const parse = (token: string) => {
    const m = token.match(/^([^\s:#]+\.[A-Za-z][A-Za-z0-9]{0,5})(?::\d+(?::\d+)?)?(?:(?:#|::)(.+))?$/);
    if (m && !token.includes("://")) out.push({ path: m[1], name: m[2]?.trim() || undefined });
  };
  const spans = [...check.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  for (const span of spans) {
    const hash = span.match(/^(\S+?#)(.+)$/);
    if (hash) parse(hash[1] + hash[2]);
    else for (const token of span.split(/\s+/)) parse(token);
  }
  for (const token of check.replace(/`[^`]*`/g, " ").split(/\s+/))
    if (token.includes("/")) parse(token.replace(/[),.;]+$/, ""));
  return out;
}

function count<T extends string>(rows: Row[], values: readonly T[]) {
  const out: Record<string, number> = Object.fromEntries(values.map((v) => [v, 0]));
  for (const row of rows) {
    const status = row.cells.status?.toLowerCase();
    if (status in out) out[status]++;
  }
  return out;
}

export function lintRecord(
  markdown: string,
  options: { root?: string; requireClosed?: boolean } = {},
): LintResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const incomplete: string[] = [];
  const sections = parseSections(markdown, errors);
  for (const key of ["questions", "evidence", "decisions"] as Key[])
    if (!sections[key]) errors.push(`missing "## ${SECTIONS[key].title}" section`);
    else if (!sections[key]!.rows.length)
      errors.push(`line ${sections[key]!.line}: ${SECTIONS[key].title} table has no rows`);

  const index = (key: Key, prefix: string) => {
    const map = new Map<string, Row>();
    for (const row of sections[key]?.rows ?? []) {
      const id = row.cells.id;
      if (!new RegExp(`^${prefix}\\d+$`).test(id))
        errors.push(`line ${row.line}: ${SECTIONS[key].title} ID "${id}" must look like ${prefix}1`);
      else if (map.has(id)) errors.push(`line ${row.line}: duplicate ID ${id}`);
      else map.set(id, row);
    }
    return map;
  };
  const questions = index("questions", "Q");
  const evidence = index("evidence", "E");
  const decisions = index("decisions", "D");
  const obligations = index("obligations", "O");

  const oneOf = (row: Row, field: string, allowed: readonly string[]) => {
    const value = (row.cells[field] ?? "").toLowerCase();
    if (!allowed.includes(value))
      errors.push(
        `line ${row.line}: ${row.cells.id} ${field} "${row.cells[field] ?? ""}" must be one of ${allowed.join(", ")}`,
      );
    return value;
  };

  for (const row of evidence.values()) {
    oneOf(row, "status", EVIDENCE_STATUS);
    oneOf(row, "authority", EVIDENCE_AUTHORITY);
    if (blank(row.cells.source))
      errors.push(`line ${row.line}: ${row.cells.id} needs a source, revision or locator`);
  }

  const cited = new Set<string>();
  for (const row of decisions.values()) {
    const status = oneOf(row, "status", DECISION_STATUS);
    const refs = ids(row.cells.evidence ?? "", "E");
    refs.forEach((id) => cited.add(id));
    const known = refs.filter((id) => {
      if (evidence.has(id)) return true;
      errors.push(`line ${row.line}: ${row.cells.id} cites unknown evidence ${id}`);
      return false;
    });
    const statuses = known.map((id) => evidence.get(id)!.cells.status.toLowerCase());
    const authorities = known.map((id) => evidence.get(id)!.cells.authority.toLowerCase());
    if ((status === "supported" || status === "contested") && !statuses.includes("read"))
      errors.push(
        `line ${row.line}: ${row.cells.id} is ${status} but cites no evidence with status read; failed or skipped retrieval cannot support a claim`,
      );
    if (status === "not-found-in-surveyed-sources" && !statuses.includes("searched-no-relevant-result"))
      errors.push(
        `line ${row.line}: ${row.cells.id} is not-found-in-surveyed-sources but cites no searched-no-relevant-result evidence; a failed search is unknown, not absence`,
      );
    if (status === "not-found-in-surveyed-sources" && statuses.includes("failed"))
      warnings.push(`line ${row.line}: ${row.cells.id} is not-found but also cites failed retrieval; that part of the survey is unknown`);
    if (status === "supported" && known.length && authorities.every((a) => a === "secondary"))
      warnings.push(`line ${row.line}: ${row.cells.id} is supported only by secondary evidence`);
    if (status === "unknown") incomplete.push(`${row.cells.id} evidence status is unknown`);
  }
  for (const [id, row] of evidence)
    if (!cited.has(id) && row.cells.status.toLowerCase() === "read")
      warnings.push(`line ${row.line}: ${id} was read but no decision cites it`);

  for (const row of questions.values()) {
    const status = oneOf(row, "status", QUESTION_STATUS);
    const refs = [...ids(row.cells.answer ?? "", "D"), ...ids(row.cells.answer ?? "", "E")];
    for (const id of refs)
      if (!(id.startsWith("D") ? decisions : evidence).has(id))
        errors.push(`line ${row.line}: ${row.cells.id} answer cites unknown ${id}`);
    if (status !== "unresolved" && !refs.length)
      errors.push(`line ${row.line}: ${row.cells.id} is ${status} but its answer cites no decision or evidence ID`);
    const grounded = refs.some((id) =>
      id.startsWith("D")
        ? decisions.has(id) && decisions.get(id)!.cells.status.toLowerCase() !== "unknown"
        : evidence.get(id)?.cells.status.toLowerCase() === "read",
    );
    if (status === "answered" && refs.length && !grounded)
      errors.push(
        `line ${row.line}: ${row.cells.id} is answered but cites only unknown decisions or evidence that was not read`,
      );
    if (status && status !== "answered") incomplete.push(`${row.cells.id} is ${status}`);
  }

  const root = resolve(options.root ?? process.cwd());
  const realRoot = existsSync(root) ? realpathSync(root) : root;
  for (const row of obligations.values()) {
    const status = oneOf(row, "status", OBLIGATION_STATUS);
    const decisionRefs = ids(row.cells.decision ?? "", "D");
    if (!decisionRefs.length)
      errors.push(`line ${row.line}: ${row.cells.id} must name the decision it verifies`);
    for (const id of decisionRefs)
      if (!decisions.has(id)) errors.push(`line ${row.line}: ${row.cells.id} names unknown decision ${id}`);
    if (blank(row.cells.invariant))
      errors.push(`line ${row.line}: ${row.cells.id} needs an invariant`);
    const required = oneOf(row, "required authority", CHECK_AUTHORITY);
    if (status === "open") {
      incomplete.push(`${row.cells.id} is open`);
      continue;
    }
    if (blank(row.cells.result))
      errors.push(`line ${row.line}: ${row.cells.id} is ${status} but records no result or reason`);
    if (status === "failed") incomplete.push(`${row.cells.id} failed`);
    if (status !== "closed") continue;
    if (blank(row.cells.check))
      errors.push(`line ${row.line}: ${row.cells.id} is closed without a named check`);
    const verified = oneOf(row, "verified authority", CHECK_AUTHORITY);
    if (
      CHECK_AUTHORITY.includes(required as never) &&
      CHECK_AUTHORITY.includes(verified as never) &&
      CHECK_AUTHORITY.indexOf(verified as never) < CHECK_AUTHORITY.indexOf(required as never)
    )
      errors.push(
        `line ${row.line}: ${row.cells.id} requires ${required} evidence but was verified by ${verified}`,
      );
    const targets = checkTargets(row.cells.check ?? "");
    if (!blank(row.cells.check) && !targets.length)
      errors.push(
        `line ${row.line}: ${row.cells.id} is closed but its check names no file; cite the test, script or retained evidence path`,
      );
    for (const t of targets) {
      const target = resolve(root, t.path);
      if (isAbsolute(t.path) || relative(root, target).startsWith("..")) {
        errors.push(`line ${row.line}: ${row.cells.id} check path ${t.path} is outside --root`);
        continue;
      }
      if (!existsSync(target)) {
        errors.push(`line ${row.line}: ${row.cells.id} check file ${t.path} does not exist under ${root}`);
        continue;
      }
      const real = realpathSync(target);
      if (relative(realRoot, real).startsWith("..") || isAbsolute(relative(realRoot, real))) {
        errors.push(`line ${row.line}: ${row.cells.id} check path ${t.path} resolves outside --root`);
        continue;
      }
      if (!statSync(real).isFile()) {
        errors.push(`line ${row.line}: ${row.cells.id} check path ${t.path} is not a file`);
        continue;
      }
      if (t.name && !readFileSync(real, "utf8").includes(t.name))
        errors.push(`line ${row.line}: ${row.cells.id} check file ${t.path} does not contain "${t.name}"`);
    }
  }
  if (!sections.obligations?.rows.length)
    warnings.push("no obligation rows; adopted patterns have no tracked verification, so the build can never be complete");

  const valid = errors.length === 0;
  const research_complete =
    valid && !incomplete.some((i) => /^(Q|D)\d+/.test(i));
  const build_complete =
    research_complete &&
    !incomplete.some((i) => /^O\d+/.test(i)) &&
    (sections.obligations?.rows.length ?? 0) > 0;
  return {
    valid,
    research_complete,
    build_complete,
    errors,
    warnings,
    incomplete,
    counts: {
      questions: count(sections.questions?.rows ?? [], QUESTION_STATUS),
      evidence: count(sections.evidence?.rows ?? [], EVIDENCE_STATUS),
      decisions: count(sections.decisions?.rows ?? [], DECISION_STATUS),
      obligations: count(sections.obligations?.rows ?? [], OBLIGATION_STATUS),
    },
  };
}

export function exitCode(result: LintResult, requireClosed = false) {
  if (!result.valid) return 1;
  if (!result.research_complete) return 2;
  if (requireClosed && !result.build_complete) return 2;
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.includes("--help"))
    console.log(
      [
        "Usage: node skills/prior-art/bin/record-lint.ts [--root DIR] [--require-closed] <record.md>",
        "Validates the Questions, Evidence register, Decisions and Obligations tables of a research record.",
        "Closed obligations must name check files that exist under --root (default: current directory).",
        "Exit 0 complete, 1 invalid, 2 valid but incomplete: a partial or unresolved question or an unknown decision;",
        "with --require-closed also an open or failed obligation, or no obligation rows.",
        "Reads one local file. No network, no execution of named checks.",
      ].join("\n"),
    );
  else
    try {
      let root: string | undefined;
      let requireClosed = false;
      const files: string[] = [];
      for (let i = 0; i < args.length; i++) {
        if (args[i] === "--root") {
          if (args[i + 1] === undefined) throw Error("Missing value for --root");
          root = args[++i];
        } else if (args[i] === "--require-closed") requireClosed = true;
        else if (args[i].startsWith("-")) throw Error(`Unknown option: ${args[i]}`);
        else files.push(args[i]);
      }
      if (files.length !== 1) throw Error("Expected one record path. Use --help.");
      if (statSync(files[0]).size > 2_000_000) throw Error("Record exceeds 2 MB limit");
      const result = lintRecord(readFileSync(files[0], "utf8"), { root, requireClosed });
      console.log(JSON.stringify(result, null, 2));
      process.exitCode = exitCode(result, requireClosed);
    } catch (error) {
      console.error(error instanceof Error ? error.message : "Invalid record");
      process.exitCode = 1;
    }
}
