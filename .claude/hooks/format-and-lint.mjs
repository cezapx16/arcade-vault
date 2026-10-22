// PostToolUse hook (Write|Edit): strips blank lines from CSS, formats the touched
// file with Prettier and, for JS/TS files, runs `eslint --fix` (which also removes
// blank lines via `no-multiple-empty-lines`). Remaining lint errors are reported
// back to Claude via stderr + exit code 2.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const projectDir = path.resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
const LINTABLE = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);
const COMPACTABLE = new Set([".css"]);
const SKIPPED_DIRS = ["node_modules", ".next", ".git"];

let filePath;
try {
  const input = JSON.parse(readFileSync(0, "utf8"));
  filePath = input.tool_input?.file_path ?? input.tool_response?.filePath;
} catch {
  process.exit(0);
}
if (!filePath) process.exit(0);

const absolute = path.resolve(projectDir, filePath);
const relative = path.relative(projectDir, absolute);
if (relative.startsWith("..") || path.isAbsolute(relative)) process.exit(0);
if (SKIPPED_DIRS.some((dir) => relative.split(path.sep).includes(dir))) process.exit(0);
if (!existsSync(absolute)) process.exit(0);

const run = (script, args) =>
  execFileSync(process.execPath, [path.join(projectDir, script), ...args], {
    cwd: projectDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

if (COMPACTABLE.has(path.extname(absolute))) {
  const source = readFileSync(absolute, "utf8");
  const compact = source.replace(/^[ \t]*\r?\n/gm, "");
  if (compact !== source) writeFileSync(absolute, compact);
}

try {
  run("node_modules/prettier/bin/prettier.cjs", ["--write", "--ignore-unknown", absolute]);
} catch (error) {
  process.stderr.write(`Prettier failed on ${relative}:\n${error.stderr ?? error.message}\n`);
}

if (LINTABLE.has(path.extname(absolute))) {
  try {
    run("node_modules/eslint/bin/eslint.js", ["--fix", absolute]);
  } catch (error) {
    process.stderr.write(
      `ESLint found problems in ${relative}:\n${error.stdout ?? ""}${error.stderr ?? ""}`,
    );
    process.exit(2);
  }
}
