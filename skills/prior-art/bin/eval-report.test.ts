import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { reportManifest, validateManifest } from "./eval-report.ts";
function sample() {
  return JSON.parse(
    readFileSync(
      new URL("../../../docs/evals/synthetic-manifest.json", import.meta.url),
      "utf8",
    ),
  );
}
test("synthetic scores are explicitly labeled and unknown costs never become zero", () => {
  const r = reportManifest(sample());
  assert.equal(r.synthetic, true);
  assert.match(r.notice, /Not benchmark evidence/);
  assert.equal(r.summary.paired_human_review, 1);
  assert.deepEqual(r.pairs[0].cost_usd, {
    baseline: null,
    candidate: null,
    delta: null,
  });
  assert.equal(r.summary.missing_pairs, 1);
  assert.deepEqual(r.pairs[1].missing_sides, ["candidate"]);
  assert.equal(r.pairs[1].rubric_delta, null);
});
test("condition mismatches suppress comparisons, including cost deltas", () => {
  for (const field of [
    "task_sha256",
    "model",
    "runtime",
    "tools",
    "source_snapshot",
    "budget",
  ]) {
    const m = sample();
    m.pairs[0].candidate.conditions[field] =
      field === "tools"
        ? ["different-tool"]
        : field === "task_sha256"
          ? "1".repeat(64)
          : "different";
    m.pairs[0].baseline.cost_usd = 1;
    m.pairs[0].candidate.cost_usd = 2;
    const p = reportManifest(m).pairs[0];
    assert.equal(p.status, "conditions_mismatch");
    assert.deepEqual(p.mismatched_conditions, [field]);
    assert.equal(p.rubric_delta, null);
    assert.equal(p.cost_usd.delta, null);
  }
});
test("tool order is irrelevant but human review is required", () => {
  const m = sample();
  m.pairs[0].baseline.conditions.tools = ["a", "b"];
  m.pairs[0].candidate.conditions.tools = ["b", "a"];
  m.pairs[0].candidate.human_review = null;
  const p = reportManifest(m).pairs[0];
  assert.equal(p.status, "awaiting_human_review");
  assert.equal(p.rubric_delta, null);
});
test("known zero cost differs from unknown, reviewer score arithmetic only", () => {
  const m = sample();
  m.pairs[0].baseline.cost_usd = 0;
  m.pairs[0].candidate.cost_usd = 2;
  m.pairs[0].candidate.human_review.scores.citation_verification = 2;
  const p = reportManifest(m).pairs[0];
  assert.equal(p.cost_usd.delta, 2);
  assert.equal(p.rubric_delta?.citation_verification, 1);
});
test("missing both runs and partial cost measurements are explicit", () => {
  const m = sample();
  m.pairs[1].baseline = null;
  m.pairs[0].candidate.cost_usd = 3;
  const r = reportManifest(m);
  assert.deepEqual(r.pairs[1].missing_sides, ["baseline", "candidate"]);
  assert.equal(r.pairs[0].cost_usd.delta, null);
});
test("invalid manifest fields and unjustified grades fail validation", () => {
  const mutate = [
    (m: any) => {
      delete m.pairs[0].candidate.cost_usd;
    },
    (m: any) => {
      m.pairs[0].baseline.cost_usd = -1;
    },
    (m: any) => {
      m.pairs[0].baseline.human_review.scores.uncertainty = 3;
    },
    (m: any) => {
      m.pairs[0].baseline.human_review.evidence = " ";
    },
    (m: any) => {
      m.pairs[0].baseline.revision = "wrong";
    },
    (m: any) => {
      m.pairs[1].id = m.pairs[0].id;
    },
    (m: any) => {
      m.synthetic = "false";
    },
    (m: any) => {
      m.pairs[0].baseline.conditions.tools = ["same", "same"];
    },
    (m: any) => {
      m.pairs[0].candidate.automatic_grade = 2;
    },
  ];
  for (const change of mutate) {
    const m = sample();
    change(m);
    assert.throws(() => validateManifest(m));
  }
});
test("CLI smoke reports fixture without resolving artifact strings", () => {
  const p = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL("./eval-report.ts", import.meta.url)),
      fileURLToPath(
        new URL("../../../docs/evals/synthetic-manifest.json", import.meta.url),
      ),
    ],
    { encoding: "utf8" },
  );
  assert.equal(p.status, 0, p.stderr);
  assert.equal(JSON.parse(p.stdout).synthetic, true);
});
test("CLI rejects invalid JSON and oversized manifests with nonzero exit", async () => {
  const { mkdtempSync, writeFileSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = mkdtempSync(join(tmpdir(), "prior-art-eval-"));
  try {
    const path = join(dir, "manifest.json");
    for (const [body, message] of [
      ["{broken", "JSON"],
      [" ".repeat(2_000_001), "2 MB"],
    ]) {
      writeFileSync(path, body);
      const result = spawnSync(
        process.execPath,
        [fileURLToPath(new URL("./eval-report.ts", import.meta.url)), path],
        { encoding: "utf8" },
      );
      assert.equal(result.status, 1);
      assert.match(result.stderr, new RegExp(message, "i"));
      assert.equal(result.stdout, "");
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
