#!/usr/bin/env python3
"""PostToolUse Hook: Run bun typecheck after editing TypeScript files."""
import json
import subprocess
import sys

data = json.load(sys.stdin)
file_path = data.get("tool_input", {}).get("file_path", "")

if not file_path.endswith(".ts"):
    sys.exit(0)

result = subprocess.run(
    ["node", "node_modules/typescript/lib/tsc.js", "--noEmit"],
    capture_output=True,
    text=True,
)

if result.returncode != 0:
    output = result.stdout + result.stderr
    lines = output.splitlines()
    relevant = [l for l in lines if "error TS" in l][:8]
    msg = "\n".join(relevant) if relevant else output[:600]
    print(f"TypeScript errors in {file_path}:\n{msg}", file=sys.stderr)
    sys.exit(2)

sys.exit(0)
