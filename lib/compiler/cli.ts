// lib/compiler/cli.ts
// CLI wrapper around the TypeScript compile pipeline.

import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import * as path from "node:path";

import { compile } from "./compile.js";
import type { CompileResult } from "./compile.js";
import { formatErrors } from "./errors.js";

interface ParsedArgs {
  input: string | null;
  kb: string | null;
  transport: "console" | "official";
  fileKey: string | null;
  out: string | null;
  chunkIndex: number | null;
  dryRun: boolean;
  verbose: boolean;
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const args: ParsedArgs = {
    input: null,
    kb: null,
    transport: "console",
    fileKey: null,
    out: null,
    chunkIndex: null,
    dryRun: false,
    verbose: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = (): string => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${arg} requires a value`);
      return v;
    };
    switch (arg) {
      case "--input":
        args.input = next();
        break;
      case "--kb":
        args.kb = next();
        break;
      case "--transport": {
        const v = next();
        if (v !== "console" && v !== "official") {
          throw new Error(`--transport must be "console" or "official"`);
        }
        args.transport = v;
        break;
      }
      case "--file-key":
        args.fileKey = next();
        break;
      case "--out":
        args.out = next();
        break;
      case "--chunk-index":
        args.chunkIndex = Number.parseInt(next(), 10);
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      case "--verbose":
        args.verbose = true;
        break;
    }
  }
  return args;
}

export async function runCompileCli(argv: readonly string[]): Promise<void> {
  const args = parseArgs(argv);
  if (!args.input) throw new Error("--input <path> is required");
  if (!args.kb) throw new Error("--kb <path> is required");
  if (args.transport === "official" && !args.fileKey) {
    throw new Error("--file-key <key> is required for the official transport");
  }

  const inputPath = path.resolve(args.input);
  if (!existsSync(inputPath)) throw new Error(`input file not found: ${inputPath}`);

  const inputStr = await readFile(inputPath, "utf8");
  const result: CompileResult = compile({
    input: inputStr,
    kbPath: path.resolve(args.kb),
    transport: args.transport,
    fileKey: args.fileKey,
    verbose: args.verbose,
  });

  if (args.dryRun) {
    const output = {
      valid: result.success,
      errors: result.errors.map((e) => ({
        code: e.code,
        message: e.message,
        node: e.node,
        path: e.path,
      })),
      warnings: result.warnings.map((w) => ({
        code: w.code,
        message: w.message,
        node: w.node,
        path: w.path,
      })),
    };
    process.stdout.write(JSON.stringify(output, null, 2) + "\n");
    if (!result.success) process.exit(1);
    return;
  }

  if (!result.success) {
    process.stderr.write(formatErrors(result.errors) + "\n");
    process.exit(1);
  }

  if (result.warnings.length > 0) {
    process.stderr.write(formatErrors(result.warnings) + "\n");
  }

  const chunks =
    args.chunkIndex != null
      ? result.chunks.filter((_c, idx) => idx === args.chunkIndex)
      : result.chunks;

  if (args.out) {
    const outDir = path.resolve(args.out);
    await mkdir(outDir, { recursive: true });
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]!;
      const fileName = `chunk-${i}-${chunk.id}.js`;
      await writeFile(path.join(outDir, fileName), chunk.code, "utf8");
    }
    const planMeta = {
      version: "3.0",
      chunks: result.chunks.map((c, idx) => ({
        index: idx,
        label: c.id,
        file: `chunk-${idx}-${c.id}.js`,
        description: c.description,
      })),
      transport: args.transport,
      totalChunks: result.plan?.totalChunks,
      totalImports: result.plan?.totalImports,
      estimatedCodeSize: result.plan?.estimatedCodeSize,
    };
    await writeFile(
      path.join(outDir, "plan.json"),
      JSON.stringify(planMeta, null, 2) + "\n",
      "utf8"
    );
    if (args.verbose) {
      process.stderr.write(`[output] wrote ${chunks.length} chunk(s) to ${outDir}\n`);
    }
  } else {
    process.stdout.write(JSON.stringify(chunks, null, 2) + "\n");
  }
}
