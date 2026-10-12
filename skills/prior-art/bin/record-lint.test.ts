import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { exitCode, lintRecord } from "./record-lint.ts";

const example = readFileSync(
  new URL("../../../docs/examples/evidence-ledger.md", import.meta.url),
  "utf8",
);
const cli = fileURLToPath(new URL("./record-lint.ts", import.meta.url));

function record(parts: {
  questions?: string;
  evidence?: string;
  decisions?: string;
  obligations?: string | null;
}) {
  const q =
    parts.questions ?? "| Q1 | Is X safe? | source | answered | D1 |";
  const e =
    parts.evidence ?? "| E1 | Implementation | source | repo@abc path:1 | read | X |";
  const d = parts.decisions ?? "| D1 | X / T1 | supported | E1 | Do X |";
  const o =
    parts.obligations === undefined
      ? "| O1 | D1 | X holds | unit | - | - | - | open |"
      : parts.obligations;
  return [
    "# Record",
    "## Questions",
    "| ID | Question | Needs | Status | Answer |",
    "| --- | --- | --- | --- | --- |",
    q,
    "## Evidence register",
    "| ID | Family | Authority | Source / revision / locator | Status | Establishes |",
    "| --- | --- | --- | --- | --- | --- |",
    e,
    "## Decisions",
    "| ID | Decision | Status | Evidence | Recommendation |",
    "| --- | --- | --- | --- | --- |",
    d,
    ...(o === null
      ? []
      : [
          "## Obligations",
          "| ID | Decision | Invariant | Required authority | Check | Verified authority | Result | Status |",
          "| --- | --- | --- | --- | --- | --- | --- | --- |",
          o,
        ]),
  ].join("\n");
}

test("the published example is valid, research-incomplete only where it says so", () => {
  const r = lintRecord(example);
  assert.deepEqual(r.errors, []);
  assert.equal(r.valid, true);
  assert.deepEqual(r.incomplete, ["Q3 is partial", "O1 is open", "O2 is open"]);
  assert.equal(r.research_complete, false);
  assert.equal(r.counts.obligations.waived, 1);
  assert.equal(exitCode(r), 2);
});

test("a fully answered record with open obligations is research-complete, not build-complete", () => {
  const r = lintRecord(record({}));
  assert.equal(r.research_complete, true);
  assert.equal(r.build_complete, false);
  assert.equal(exitCode(r), 0);
  assert.equal(exitCode(r, true), 2);
});

test("failed or skipped retrieval cannot support a decision", () => {
  for (const status of ["failed", "not-applicable", "searched-no-relevant-result"]) {
    const r = lintRecord(
      record({ evidence: `| E1 | Implementation | source | repo@abc | ${status} | X |` }),
    );
    assert.equal(r.valid, false, status);
    assert.match(r.errors.join("\n"), /cites no evidence with status read/);
  }
});

test("a failed search never becomes not-found", () => {
  const r = lintRecord(
    record({
      evidence: "| E1 | Incidents | history | query, provider | failed | nothing |",
      decisions: "| D1 | X | not-found-in-surveyed-sources | E1 | none |",
    }),
  );
  assert.match(r.errors.join("\n"), /failed search is unknown, not absence/);
});

test("citations must resolve and answered questions must cite something", () => {
  const r = lintRecord(
    record({
      questions: "| Q1 | Is X safe? | source | answered | probably |",
      decisions: "| D1 | X | supported | E1, E9 | Do X |",
    }),
  );
  const text = r.errors.join("\n");
  assert.match(text, /cites unknown evidence E9/);
  assert.match(text, /Q1 is answered but its answer cites no decision or evidence ID/);
});

test("unknown decisions and unresolved questions keep research incomplete", () => {
  const r = lintRecord(
    record({
      questions: "| Q1 | Is X safe? | source | unresolved | - |",
      decisions: "| D1 | X | unknown | E1 | Investigate |",
    }),
  );
  assert.equal(r.valid, true);
  assert.equal(r.research_complete, false);
  assert.deepEqual(r.incomplete, ["D1 evidence status is unknown", "Q1 is unresolved", "O1 is open"]);
});

test("closing an obligation needs a check at or above the required authority", () => {
  const weak = lintRecord(
    record({
      obligations:
        "| O1 | D1 | Concurrent retries charge once | integration | Helper unit test | unit | passed | closed |",
    }),
  );
  assert.match(weak.errors.join("\n"), /requires integration evidence but was verified by unit/);
  const noResult = lintRecord(
    record({ obligations: "| O1 | D1 | X | unit | Some test | unit | - | closed |" }),
  );
  assert.match(noResult.errors.join("\n"), /records no result/);
  const noDecision = lintRecord(
    record({ obligations: "| O1 | D7 | X | unit | - | - | - | open |" }),
  );
  assert.match(noDecision.errors.join("\n"), /unknown decision D7/);
});

test("closed obligations must name check files that exist and contain the test", () => {
  const root = mkdtempSync(join(tmpdir(), "record-lint-"));
  mkdirSync(join(root, "test"));
  writeFileSync(join(root, "test/pay.test.ts"), 'test("concurrent retries", () => {})');
  const closed = (check: string) =>
    lintRecord(
      record({
        obligations: `| O1 | D1 | X | integration | ${check} | end-to-end | passed 2026-10-12 | closed |`,
      }),
      { root },
    );
  const ok = closed("`test/pay.test.ts#concurrent retries`");
  assert.deepEqual(ok.errors, []);
  assert.equal(ok.build_complete, true);
  assert.match(closed("`test/missing.test.ts`").errors.join("\n"), /does not exist/);
  assert.match(closed("`test/pay.test.ts#other name`").errors.join("\n"), /does not contain "other name"/);
  assert.match(closed("`../outside.test.ts`").errors.join("\n"), /outside --root/);
});

test("structure errors: missing sections, columns, bad IDs and duplicates", () => {
  assert.match(lintRecord("# Empty").errors.join("\n"), /missing "## questions" section/);
  const dup = lintRecord(
    record({
      evidence:
        "| E1 | A | source | x | read | y |\n| E1 | B | source | z | read | w |\n| X2 | C | source | z | read | w |",
    }),
  );
  const text = dup.errors.join("\n");
  assert.match(text, /duplicate ID E1/);
  assert.match(text, /ID "X2" must look like E1/);
  const columns = lintRecord(
    record({}).replace("| ID | Decision | Status | Evidence | Recommendation |", "| ID | Decision | Status | Recommendation |"),
  );
  assert.match(columns.errors.join("\n"), /decisions table missing column\(s\): evidence/);
});

test("escaped pipes and fenced tables are handled", () => {
  const r = lintRecord(
    record({ evidence: "| E1 | Impl | source | repo@abc a \\| b | read | X |" }) +
      "\n\n```md\n## Decisions\n| ID | Decision | Status | Evidence |\n```\n",
  );
  assert.deepEqual(r.errors, []);
});

test("CLI exit codes: 0 complete, 2 incomplete, 1 invalid", () => {
  const dir = mkdtempSync(join(tmpdir(), "record-lint-cli-"));
  const run = (body: string, ...flags: string[]) => {
    const path = join(dir, `r${Math.random()}.md`);
    writeFileSync(path, body);
    return spawnSync(process.execPath, [cli, ...flags, path], { encoding: "utf8" }).status;
  };
  assert.equal(run(record({})), 0);
  assert.equal(run(record({}), "--require-closed"), 2);
  assert.equal(run(example), 2);
  assert.equal(run("# nothing"), 1);
  assert.equal(
    spawnSync(process.execPath, [cli, "--bogus", "x.md"], { encoding: "utf8" }).status,
    1,
  );
});

// Regressions from the independent review of 0.8.0.
const OBL_HEAD =
  "| ID | Decision | Invariant | Required authority | Check | Verified authority | Result | Status |\n| --- | --- | --- | --- | --- | --- | --- | --- |";

test("sub-headings and second tables stay inside their section", () => {
  const sub = lintRecord(
    record({ obligations: null }) +
      `\n## Obligations\n### Phase 1\n${OBL_HEAD}\n| O1 | D1 | X | unit | - | - | - | open |\nPhase 2:\n${OBL_HEAD}\n| O2 | D1 | Y | unit | - | - | - | open |`,
  );
  assert.equal(sub.counts.obligations.open, 2);
  assert.equal(exitCode(sub, true), 2);
  const twoQ = lintRecord(
    record({}).replace(
      "## Evidence register",
      "More questions:\n| ID | Question | Needs | Status | Answer |\n| --- | --- | --- | --- | --- |\n| Q2 | Y? | x | unresolved | - |\n## Evidence register",
    ),
  );
  assert.equal(twoQ.research_complete, false);
  assert.ok(twoQ.incomplete.includes("Q2 is unresolved"));
});

test("ID rows outside a known section and pipe-less tables are errors", () => {
  const stray = lintRecord(record({}) + "\n## Notes\n| ID | x |\n| --- | --- |\n| O9 | hidden |");
  assert.match(stray.errors.join("\n"), /row O9 is outside/);
  const bare = lintRecord(
    record({ obligations: null }) +
      "\n## Obligations\nID | Decision | Invariant | Required authority | Check | Verified authority | Result | Status\n--- | --- | --- | --- | --- | --- | --- | ---\nO1 | D1 | X | unit | - | - | - | open",
  );
  assert.match(bare.errors.join("\n"), /need leading and trailing pipes/);
});

test("no obligation rows never counts as build-complete", () => {
  for (const tail of [`\n## Obligations\n${OBL_HEAD}`, "\n## Obligations\nNone yet.", ""]) {
    const r = lintRecord(record({ obligations: null }) + tail);
    assert.equal(r.build_complete, false, JSON.stringify(tail));
    assert.equal(exitCode(r, true), 2);
  }
});

test("closed checks: every path form is verified, and a check must name a file", () => {
  const root = mkdtempSync(join(tmpdir(), "record-lint-forms-"));
  mkdirSync(join(root, "test"));
  mkdirSync(join(root, "dir.d"));
  writeFileSync(join(root, "test/ok_test.py"), "def test_x(): pass");
  const errs = (check: string) =>
    lintRecord(
      record({
        obligations: `| O1 | D1 | X | unit | ${check} | unit | passed | closed |`,
      }),
      { root },
    ).errors.join("\n");
  for (const check of [
    "`test/missing.test.ts:12`",
    "`pytest test/missing_test.py::test_x`",
    "`npm test -- test/missing.test.ts`",
    "test/missing.test.ts#x",
  ])
    assert.match(errs(check), /does not exist/, check);
  assert.equal(errs("`pytest test/ok_test.py::test_x`"), "");
  assert.equal(errs("`test/ok_test.py:1`"), "");
  assert.match(errs("`pytest test/ok_test.py::test_y`"), /does not contain "test_y"/);
  assert.match(errs("Ran the helper by hand"), /names no file/);
  assert.match(errs("`dir.d#anything`"), /is not a file/);
});

test("symlinks cannot escape --root", () => {
  const base = mkdtempSync(join(tmpdir(), "record-lint-link-"));
  const root = join(base, "root");
  mkdirSync(join(root, "test"), { recursive: true });
  writeFileSync(join(base, "outside.txt"), "secret token");
  symlinkSync(join(base, "outside.txt"), join(root, "test/link.ts"));
  const r = lintRecord(
    record({
      obligations: "| O1 | D1 | X | unit | `test/link.ts#secret token` | unit | passed | closed |",
    }),
    { root },
  );
  assert.match(r.errors.join("\n"), /resolves outside --root/);
});

test("a missing column reports an error instead of crashing", () => {
  const r = lintRecord(
    record({}).replace(
      "| ID | Family | Authority | Source / revision / locator | Status | Establishes |",
      "| ID | Family | Authority | Source / revision / locator | State | Establishes |",
    ),
  );
  assert.match(r.errors.join("\n"), /evidence register table missing column\(s\): status/);
});

test("answered questions must rest on read evidence or a non-unknown decision", () => {
  const r = lintRecord(
    record({
      questions: "| Q1 | Is X safe? | source | answered | E2 |",
      evidence:
        "| E1 | Impl | source | repo@abc | read | X |\n| E2 | Incidents | history | query | failed | nothing |",
    }),
  );
  assert.match(r.errors.join("\n"), /cites only unknown decisions or evidence that was not read/);
  const nf = lintRecord(
    record({
      evidence:
        "| E1 | Impl | source | repo@abc | read | X |\n| E2 | A | history | q1 | searched-no-relevant-result | none |\n| E3 | B | history | q2 | failed | timeout |",
      decisions: "| D1 | X | supported | E1 | Do X |\n| D2 | Y | not-found-in-surveyed-sources | E2, E3 | none |",
    }),
  );
  assert.match(nf.warnings.join("\n"), /also cites failed retrieval/);
});
