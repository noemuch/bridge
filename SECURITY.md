# Security Policy

## Reporting vulnerabilities

If you discover a security vulnerability in Bridge, please **do not** open a public issue. Instead, email the maintainer directly: https://github.com/noemuch (follow the contact link in the profile).

We aim to acknowledge reports within 48 hours and ship a fix within 7 days for critical issues.

## Token handling

Bridge requires a Figma Personal Access Token (`FIGMA_TOKEN`) to extract design-system data from Figma.

**Scope minimization (user responsibility):** Generate tokens with read-only scopes:

- `File content` → Read-only
- `File variables` → Read-only (Enterprise plans only)
- `Library content` → Read-only

**Lifecycle hygiene (enforced by Bridge v4.1.0+):**

- Tokens pasted interactively in Claude Code use a stdin-only pipe (no echo, no shell history).
- Tokens are validated in-memory, then sent directly to GitHub Secrets via `gh secret set` (stdin-piped, never via argv).
- Tokens never touch `process.env`, `.env` files, or local logs.
- Token values are masked to `figd_***<last4>` in any log output.

**Rotation (user responsibility):** Rotate your `FIGMA_TOKEN` every 90 days or immediately if compromised.

## Supply chain

`@noemuch/bridge-ds` is published to npm with `--access public`. As of v4.1.0, we do not yet ship signed attestations; this is planned for v4.2.0+.

**User mitigation:** Pin Bridge versions in your cron workflow:

```yaml
- run: npm install @noemuch/bridge-ds@4.1.0 # not @latest
```

**CI considerations:** The `bridge-docs-cron.yml` workflow runs inside GitHub Actions with access to `FIGMA_TOKEN`. Scope this secret to the `.github/workflows/bridge-docs-cron.yml` file only; do not add it to other workflows.

## Known limitations (v4.1.0)

- **figma-console-mcp** (the MCP server we rely on for interactive extraction) is a third-party unofficial tool. Its WebSocket runs on localhost. Any process with filesystem access to the user's machine could theoretically connect. Mitigation: the WebSocket pairs only with Figma Desktop; no tokens transit through it.
- **Figma REST API for variables** requires an Enterprise plan. Non-Enterprise users will see a 403 for `/variables/local` and fall back to a reduced cron extract (components + text styles only). Interactive MCP extraction bypasses this limitation.

## Incident history

- 2026-04-15 — Initial security posture documented (v4.1.0).

---

_Last updated: 2026-04-15_
