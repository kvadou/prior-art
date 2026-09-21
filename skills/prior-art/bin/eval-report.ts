import { readFileSync, statSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const RUBRIC = [
  "applicable_evidence",
  "citation_verification",
  "uncertainty",
  "source_independence",
  "budget_compliance",
  "scope_preservation",
  "verification_consequences",
] as const;
type Dimension = (typeof RUBRIC)[number];
type Conditions = {
  task_sha256: string;
  model: string;
  runtime: string;
  tools: string[];
  source_snapshot: string;
  budget: string;
};
type Review = {
  reviewer: string;
  evidence: string;
  notes: string;
  scores: Record<Dimension, number>;
};
type Run = {
  revision: string;
  output: string;
  conditions: Conditions;
  cost_usd: number | null;
  elapsed_seconds: number | null;
  human_review: Review | null;
};
export type Manifest = {
  schema_version: 1;
  synthetic: boolean;
  baseline_revision: string;
  candidate_revision: string;
  pairs: {
    id: string;
    task: string;
    baseline: Run | null;
    candidate: Run | null;
  }[];
};
function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error(`${label}: expected object`);
  return value as Record<string, unknown>;
}
function exact(value: Record<string, unknown>, keys: string[], label: string) {
  for (const key of Object.keys(value))
    if (!keys.includes(key)) throw Error(`${label}: unknown field ${key}`);
  for (const key of keys)
    if (!(key in value)) throw Error(`${label}: missing ${key}`);
}
function text(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !value.trim() || value.length > 20000)
    throw Error(`${label}: expected nonempty text (maximum 20,000 characters)`);
}
function metric(value: unknown, label: string) {
  if (
    value !== null &&
    (typeof value !== "number" || !Number.isFinite(value) || value < 0)
  )
    throw Error(`${label}: expected a nonnegative number or null for unknown`);
}
function run(value: unknown, label: string, revision: string) {
  if (value === null) return;
  const v = object(value, label);
  exact(
    v,
    [
      "revision",
      "output",
      "conditions",
      "cost_usd",
      "elapsed_seconds",
      "human_review",
    ],
    label,
  );
  text(v.revision, `${label}.revision`);
  if (v.revision !== revision)
    throw Error(`${label}: revision does not match manifest`);
  text(v.output, `${label}.output`);
  metric(v.cost_usd, `${label}.cost_usd`);
  metric(v.elapsed_seconds, `${label}.elapsed_seconds`);
  const c = object(v.conditions, `${label}.conditions`);
  exact(
    c,
    ["task_sha256", "model", "runtime", "tools", "source_snapshot", "budget"],
    `${label}.conditions`,
  );
  for (const key of [
    "task_sha256",
    "model",
    "runtime",
    "source_snapshot",
    "budget",
  ])
    text(c[key], `${label}.conditions.${key}`);
  if (!/^[a-f0-9]{64}$/.test(c.task_sha256 as string))
    throw Error(`${label}.conditions.task_sha256: expected lowercase SHA-256`);
  if (!Array.isArray(c.tools) || c.tools.length > 100)
    throw Error(`${label}.conditions.tools: expected array (maximum 100)`);
  c.tools.forEach((item, index) =>
    text(item, `${label}.conditions.tools[${index}]`),
  );
  if (new Set(c.tools).size !== c.tools.length)
    throw Error(`${label}.conditions.tools: duplicate tool`);
  if (v.human_review !== null) {
    const r = object(v.human_review, `${label}.human_review`);
    exact(
      r,
      ["reviewer", "evidence", "notes", "scores"],
      `${label}.human_review`,
    );
    for (const key of ["reviewer", "evidence", "notes"])
      text(r[key], `${label}.human_review.${key}`);
    const scores = object(r.scores, `${label}.human_review.scores`);
    exact(scores, [...RUBRIC], `${label}.human_review.scores`);
    for (const dim of RUBRIC)
      if (
        !Number.isInteger(scores[dim]) ||
        Number(scores[dim]) < 0 ||
        Number(scores[dim]) > 2
      )
        throw Error(
          `${label}.human_review.scores.${dim}: expected integer 0, 1 or 2`,
        );
  }
}
export function validateManifest(value: unknown): Manifest {
  const v = object(value, "manifest");
  exact(
    v,
    [
      "schema_version",
      "synthetic",
      "baseline_revision",
      "candidate_revision",
      "pairs",
    ],
    "manifest",
  );
  if (v.schema_version !== 1 || typeof v.synthetic !== "boolean")
    throw Error(
      "manifest: schema_version must be 1 and synthetic must be boolean",
    );
  text(v.baseline_revision, "baseline_revision");
  text(v.candidate_revision, "candidate_revision");
  if (v.baseline_revision === v.candidate_revision)
    throw Error("manifest: baseline and candidate revisions must differ");
  if (!Array.isArray(v.pairs) || v.pairs.length < 1 || v.pairs.length > 100)
    throw Error("pairs: expected 1 to 100 pairs");
  const ids = new Set<string>();
  v.pairs.forEach((item, index) => {
    const label = `pairs[${index}]`;
    const p = object(item, label);
    exact(p, ["id", "task", "baseline", "candidate"], label);
    text(p.id, `${label}.id`);
    text(p.task, `${label}.task`);
    if (ids.has(p.id)) throw Error(`${label}: duplicate pair id`);
    ids.add(p.id);
    run(p.baseline, `${label}.baseline`, v.baseline_revision as string);
    run(p.candidate, `${label}.candidate`, v.candidate_revision as string);
  });
  return value as Manifest;
}
export function reportManifest(input: unknown) {
  const manifest = validateManifest(input);
  const pairs = manifest.pairs.map((pair) => {
    const { baseline: b, candidate: c } = pair;
    const missing_sides = [
      !b ? "baseline" : null,
      !c ? "candidate" : null,
    ].filter(Boolean) as string[];
    const mismatched_conditions =
      b && c
        ? Object.keys(b.conditions).filter((key) => {
            const k = key as keyof Conditions;
            return (
              JSON.stringify(
                k === "tools"
                  ? [...b.conditions.tools].sort()
                  : b.conditions[k],
              ) !==
              JSON.stringify(
                k === "tools"
                  ? [...c.conditions.tools].sort()
                  : c.conditions[k],
              )
            );
          })
        : [];
    const same_conditions = !!b && !!c && !mismatched_conditions.length;
    const reviewed = !!b?.human_review && !!c?.human_review;
    return {
      id: pair.id,
      status: missing_sides.length
        ? "missing_pair"
        : !same_conditions
          ? "conditions_mismatch"
          : !reviewed
            ? "awaiting_human_review"
            : "paired_human_review",
      missing_sides,
      mismatched_conditions,
      rubric_delta:
        same_conditions && reviewed
          ? Object.fromEntries(
              RUBRIC.map((dim) => [
                dim,
                c!.human_review!.scores[dim] - b!.human_review!.scores[dim],
              ]),
            )
          : null,
      cost_usd: {
        baseline: b?.cost_usd ?? null,
        candidate: c?.cost_usd ?? null,
        delta:
          same_conditions && b!.cost_usd !== null && c!.cost_usd !== null
            ? c!.cost_usd! - b!.cost_usd!
            : null,
      },
      elapsed_seconds: {
        baseline: b?.elapsed_seconds ?? null,
        candidate: c?.elapsed_seconds ?? null,
        delta:
          same_conditions &&
          b!.elapsed_seconds !== null &&
          c!.elapsed_seconds !== null
            ? c!.elapsed_seconds! - b!.elapsed_seconds!
            : null,
      },
      human_reviews: {
        baseline: b?.human_review ?? null,
        candidate: c?.human_review ?? null,
      },
      outputs: { baseline: b?.output ?? null, candidate: c?.output ?? null },
    };
  });
  return {
    schema_version: 1,
    synthetic: manifest.synthetic,
    notice: manifest.synthetic
      ? "SYNTHETIC FIXTURE. Not benchmark evidence."
      : "Manifest assertions and human judgments only. This tool does not verify run provenance, artifact contents, citations or grading accuracy.",
    baseline_revision: manifest.baseline_revision,
    candidate_revision: manifest.candidate_revision,
    summary: {
      pairs: pairs.length,
      missing_pairs: pairs.filter((p) => p.status === "missing_pair").length,
      conditions_mismatch: pairs.filter(
        (p) => p.status === "conditions_mismatch",
      ).length,
      awaiting_human_review: pairs.filter(
        (p) => p.status === "awaiting_human_review",
      ).length,
      paired_human_review: pairs.filter(
        (p) => p.status === "paired_human_review",
      ).length,
    },
    pairs,
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--help")
    console.log(
      "Usage: node skills/prior-art/bin/eval-report.ts <manifest.json>\nValidates a local paired-evaluation manifest and prints JSON. No network, artifact execution or automatic grading.",
    );
  else
    try {
      if (args.length !== 1)
        throw Error("Expected one manifest path. Use --help.");
      if (statSync(args[0]).size > 2_000_000)
        throw Error("Manifest exceeds 2 MB limit");
      console.log(
        JSON.stringify(
          reportManifest(JSON.parse(readFileSync(args[0], "utf8"))),
          null,
          2,
        ),
      );
    } catch (error) {
      console.error(
        error instanceof Error ? error.message : "Invalid manifest",
      );
      process.exitCode = 1;
    }
}
