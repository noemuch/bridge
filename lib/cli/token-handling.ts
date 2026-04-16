// lib/cli/token-handling.ts
import { spawn as realSpawn } from "node:child_process";

export type SpawnImpl = typeof realSpawn;

export interface SetGitHubSecretOptions {
  name: string;
  value: string;
  repo: string;
  spawnImpl?: SpawnImpl;
}

/**
 * Send a secret to GitHub via `gh secret set`, piping the value through stdin.
 * The value NEVER appears in argv (not visible via `ps aux`).
 */
export async function setGitHubSecret(opts: SetGitHubSecretOptions): Promise<void> {
  const spawnFn = opts.spawnImpl ?? realSpawn;
  const proc = spawnFn("gh", ["secret", "set", opts.name, "--repo", opts.repo], {
    stdio: ["pipe", "inherit", "inherit"],
  });

  proc.stdin!.write(opts.value);
  proc.stdin!.end();

  return new Promise<void>((resolve, reject) => {
    proc.on("exit", (code: number | null) => {
      if (code === 0) resolve();
      else reject(new Error(`gh secret set exited with code ${code}`));
    });
  });
}

/**
 * Safely represent a token for logging: figd_***<last4>.
 * Never logs the full token.
 */
export function maskToken(token: string): string {
  if (!token) return "(empty)";
  if (token.length < 12) return "***";
  return `figd_***${token.slice(-4)}`;
}

/**
 * Validate a Figma token against the /v1/me endpoint. Never logs the token.
 * Returns true on 2xx, false on 4xx (invalid/expired).
 */
export async function validateFigmaToken(
  token: string,
  fetchImpl: typeof fetch = fetch
): Promise<boolean> {
  try {
    const res = await fetchImpl("https://api.figma.com/v1/me", {
      headers: { "X-Figma-Token": token },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Test if the token can access the /variables/local endpoint for a given file.
 * Returns "ok" (200), "forbidden" (403 — non-Enterprise plan), or "error" (other).
 */
export async function probeVariablesEndpoint(
  token: string,
  fileKey: string,
  fetchImpl: typeof fetch = fetch
): Promise<"ok" | "forbidden" | "error"> {
  try {
    const res = await fetchImpl(`https://api.figma.com/v1/files/${fileKey}/variables/local`, {
      headers: { "X-Figma-Token": token },
    });
    if (res.ok) return "ok";
    if (res.status === 403) return "forbidden";
    return "error";
  } catch {
    return "error";
  }
}
