# Security Policy

## Threat model

The Concept Model app is a **local-only dev tool**. It is designed to run on your own machine, alongside Claude Code or another local AI assistant. It is NOT designed for:

- Multi-user deployment
- LAN exposure
- Internet-facing deployment
- Storing sensitive / regulated data

The dev server binds to `127.0.0.1:5116` and the SvelteKit `+server.ts` API routes write JSON files directly to `data/`. There is no authentication. Anyone who can reach the port can read, overwrite, or delete your concept models.

If you need to share a concept model, use the **Export JSON / CSV / Excel** buttons and share the downloaded files — never the server.

## Supported versions

Only the latest commit on `main` is supported. We don't backport security fixes to older releases. If you're running a fork, rebase onto current `main` to pick up patches.

## Reporting a vulnerability

Please report security issues privately to [security@AgileDataGuides.com](mailto:security@AgileDataGuides.com). Include:

- A description of the issue and the impact you believe it has.
- Steps to reproduce, or a proof-of-concept if available.
- The commit SHA you tested against.

**Do NOT** open a public GitHub issue for vulnerability reports — opening one accidentally is fine, just close it and email us instead.

## Out of scope

The following are intentional design choices, not vulnerabilities:

- **No authentication.** The app runs locally, so there's no user to authenticate. It is not built for multi-user access.
- **CSP `'unsafe-inline'`.** Required by SvelteKit hydration and Tailwind. Removing it breaks the app.
- **Filesystem writes from the dev API routes.** The threat model assumes you trust your own machine. The API rejects requests that declare an oversize body, structurally invalid models, and path-escape attempts, but it doesn't try to defend against an attacker who already has shell access.
- **`data/*.json` file format.** Anyone with shell access can hand-edit the JSON files. That's by design — it's also how Claude Code reads your concept models.

## Hardening

We do enforce some hardening even within the local-only threat model:

- The dev server binds to loopback (`127.0.0.1`), never `0.0.0.0`. Do NOT change `vite.config.ts` `server.host`.
- The POST and PUT routes reject requests whose `Content-Length` header declares more than 5 MB, and reject non-JSON or structurally invalid models. A request with no `Content-Length` header skips the size check.
- File paths from URL params are filtered through a kebab-case regex + path-prefix check so `../../etc/passwd`-style traversal can't escape `data/`.
- We don't ship the abandoned `xlsx` package. Writing XLSX is done via `exceljs`; reading XLSX is intentionally unsupported (there is no safe parser of comparable scope).
- Dependabot watches `package.json` and the GitHub Actions workflows weekly for vulnerable updates.
