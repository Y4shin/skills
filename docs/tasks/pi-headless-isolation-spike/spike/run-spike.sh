#!/usr/bin/env bash
# Throwaway spike driver: exercises pi isolation recipes and records what
# each run actually loaded (via canary.ts) plus which resources leaked.
#
# Recipes:
#   r0-realhome-flags   real agent dir + isolation flags
#                       -> real user globals (kb-ask etc.) must NOT load
#   r1-fakehome-noflags fake agent dir, NO isolation flags (positive control)
#                       -> planted leak MUST be visible (proves detection)
#   r2-fakehome-flags   fake agent dir + isolation flags + --no-approve
#                       -> only under-test skill loads
#   r3-fakehome-approve fake agent dir + isolation flags + --approve
#                       -> under-test + proj-skill load, no leak
set -uo pipefail

SPIKE="$(cd "$(dirname "$0")" && pwd)"
OUT="$SPIKE/results"
rm -rf "$OUT"; mkdir -p "$OUT"
REAL_AGENT="$HOME/.pi/agent"

# ---------- fixtures ----------
FAKE_HOME="$OUT/fake-home"; FAKE_AGENT="$FAKE_HOME/.pi/agent"
mkdir -p "$FAKE_AGENT/skills/leak-sentinel"
cat > "$FAKE_AGENT/skills/leak-sentinel/SKILL.md" <<'EOF'
---
name: leak-sentinel
description: PLANTED LEAK. Sentinel skill that must never be loaded in an eval run.
---
EOF
mkdir -p "$FAKE_AGENT/extensions"
cat > "$FAKE_AGENT/extensions/planted-leak.ts" <<'EOF'
export default function () { console.error("PLANTED EXTENSION LEAK FIRED"); }
EOF
# Seed ONLY what auth needs: credentials, provider catalog, settings
# (packages stripped so no package resources can resolve).
cp "$REAL_AGENT/auth.json" "$FAKE_AGENT/auth.json"
cp "$REAL_AGENT/models.json" "$FAKE_AGENT/models.json"
python3 - "$REAL_AGENT/settings.json" "$FAKE_AGENT/settings.json" <<'PY'
import json, sys
s = json.load(open(sys.argv[1]))
s["packages"] = []
json.dump(s, open(sys.argv[2], "w"), indent=2)
PY

# Project fixture: a project-local skill requiring trust, plus AGENTS.md.
PROJ="$OUT/fixture-repo"
mkdir -p "$PROJ/.pi/skills/proj-skill"
cat > "$PROJ/.pi/skills/proj-skill/SKILL.md" <<'EOF'
---
name: proj-skill
description: Project-local fixture skill used to test trust + isolation.
---
EOF
echo "# Fixture repo" > "$PROJ/AGENTS.md"
echo '{ "packages": [] }' > "$PROJ/.pi/settings.json"

# Under-test skill (the "treatment" resource).
UNDER="$OUT/under-test-skills"
mkdir -p "$UNDER/under-test"
cat > "$UNDER/under-test/SKILL.md" <<'EOF'
---
name: under-test
description: The skill under test. Must load in every recipe.
---
EOF

ISO_FLAGS="--no-extensions --no-skills --no-context-files --no-prompt-templates --no-themes"

run_recipe () {
  local name="$1"; local agent_dir="$2"; local extra="$3"
  local dir="$OUT/$name"; mkdir -p "$dir"
  (
    cd "$PROJ"
    CANARY_OUT="$dir/canary-report.json" \
    PI_CODING_AGENT_DIR="$agent_dir" \
      timeout 180 pi -p --no-session --mode json $extra \
        "Reply with exactly: pong" > "$dir/stream.jsonl" 2> "$dir/stderr.log"
    echo "exit=$?" >> "$dir/stderr.log"
  )
}

run_recipe r0-realhome-flags "$REAL_AGENT"      "-e $SPIKE/canary.ts --skill $UNDER/under-test $ISO_FLAGS --no-approve"
run_recipe r1-fakehome-noflags "$FAKE_AGENT"   "-e $SPIKE/canary.ts --skill $UNDER/under-test"
run_recipe r2-fakehome-flags "$FAKE_AGENT"      "-e $SPIKE/canary.ts --skill $UNDER/under-test $ISO_FLAGS --no-approve"
run_recipe r3-fakehome-approve "$FAKE_AGENT"    "-e $SPIKE/canary.ts --skill $UNDER/under-test $ISO_FLAGS --approve"

# Assertions.
python3 - "$OUT" <<'PY'
import json, pathlib, sys
out = pathlib.Path(sys.argv[1])
fail = []
REAL_USER_SKILLS = ["clipboard-management", "kb-ask", "tldraw-offline"]  # real globals, must not load anywhere
def report(r):
    d = out / r
    rep = d / "canary-report.json"
    if not rep.exists():
        fail.append(f"{r}: NO CANARY REPORT (pi crashed or canary did not fire)")
        return None
    j = json.loads(rep.read_text())
    exit_line = (d / "stderr.log").read_text().strip().splitlines()[-1]
    print(f"== {r} ==")
    print(f"   skills:       {j['skills']}")
    print(f"   contextFiles: {j['contextFiles']}")
    print(f"   exit: {exit_line}")
    print(f"   ext-leak-in-stderr: {'PLANTED EXTENSION LEAK FIRED' in (d/'stderr.log').read_text()}")
    for s in REAL_USER_SKILLS:
        if s in j["skills"]:
            fail.append(f"{r}: real user skill {s} LOADED")
    return j

r0 = report("r0-realhome-flags")
r1 = report("r1-fakehome-noflags")
r2 = report("r2-fakehome-flags")
r3 = report("r3-fakehome-approve")

if r0:
    if "under-test" not in r0["skills"]:
        fail.append("r0: under-test missing despite --skill")
    if any("AGENTS.md" in c for c in r0["contextFiles"]):
        fail.append("r0: AGENTS.md leaked despite --no-context-files")
if r1:
    # Positive control: with no isolation flags, the planted leak MUST be detected.
    if "leak-sentinel" not in r1["skills"]:
        fail.append("r1: leak-sentinel NOT loaded in positive control - canary cannot detect skill leaks")
    if not (out / "r1-fakehome-noflags" / "stderr.log").read_text().count("PLANTED EXTENSION LEAK FIRED"):
        fail.append("r1: planted extension did not fire in positive control - cannot detect extension leaks")
    if "under-test" not in r1["skills"]:
        fail.append("r1: under-test missing despite --skill")
if r2:
    if "leak-sentinel" in r2["skills"]:
        fail.append("r2: leak-sentinel LOADED - isolation recipe does not isolate")
    if "under-test" not in r2["skills"]:
        fail.append("r2: under-test missing despite --skill")
    if "proj-skill" in r2["skills"]:
        fail.append("r2: proj-skill loaded without --approve - trust hole")
    if any("AGENTS.md" in c for c in r2["contextFiles"]):
        fail.append("r2: AGENTS.md leaked despite --no-context-files")
if r3:
    if "leak-sentinel" in r3["skills"]:
        fail.append("r3: leak-sentinel LOADED - isolation recipe does not isolate")
    if "under-test" not in r3["skills"]:
        fail.append("r3: under-test missing despite --skill")
    # --no-skills overrides --approve for skills: trusted project-local skills
    # must NOT load (verified: discovery flags trump trust; pass fixture skills
    # via --skill instead). This recipe documents that override.
    if "proj-skill" in r3["skills"]:
        fail.append("r3: proj-skill loaded despite --no-skills (expected: --no-skills overrides --approve)")
    if any("AGENTS.md" in c for c in r3["contextFiles"]):
        fail.append("r3: AGENTS.md leaked despite --no-context-files")

ok = not fail
print("\n" + ("SPIKE PASS - isolation recipe confirmed" if ok else "SPIKE ISSUES:"))
for f in fail: print(" -", f)
sys.exit(0 if ok else 1)
PY
