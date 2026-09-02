# Security

EnvRadar is a command-line scanner and a GitHub Action. It reads the source
files and `.env` files in a repository, lists the environment variable names
the code expects and the names each environment provides, and prints a report.
This page says what it reads, what leaves the machine, and where the product
is not finished.

## Reporting a problem

Email hello@ambitiousmachines.com with a description and, if you have one, a
way to reproduce. We acknowledge within two working days and aim to fix
confirmed issues within the times in our severity policy. Please do not test
against other people's accounts or data.

## What this product holds

There is no hosted service, no account and no telemetry. Everything below
lives in the process for the length of one run and is gone when it exits.

| Data | Where | Retention |
|---|---|---|
| Source file paths and the variable names they read, with line numbers | Memory during a run, then the report you ask for (terminal, JSON or Markdown) | Written where you point it and kept only by you |
| Variable names from `.env` files | Memory during a run | Discarded when the run ends |
| Variable values from `.env` files | Parsed in memory only to find the keys (`src/sources/dotenv.ts`) | Never stored, never printed, never written to any report |

## What leaves the machine or the account

The `envradar` CLI makes no network calls. Its only imports are the Node
file-system and path modules and five packages that parse files and print
text (`commander`, `dotenv`, `fast-glob`, `picocolors`, `yaml`). The GitHub
Action runs the same CLI on the caller's runner and adds two recipients:

| Recipient | What | Why |
|---|---|---|
| npm registry | A request for the `envradar` package | The Action installs the CLI with `npx` on the runner |
| GitHub, the calling repository | The Markdown report: variable names, statuses and file locations, never values | Posted as a pull request comment with the token the caller grants, updated in place on each push |

## Public routes

None. The product has no server and no routes.

## Keys and rotation

| Key | Owner | Rotation |
|---|---|---|
| `github-token` input of the Action | The repository that runs the Action | Defaults to the run's own `GITHUB_TOKEN`, which GitHub issues per job and expires when the job ends. A caller who passes another token rotates it in their own account |
| npm publish rights for the `envradar` package | Rinor Hatashi | Publishing is done by hand from the maintainer's npm account. No publish token is stored in this repository or its workflows |

## Backups and recovery

The product stores nothing, so there is nothing to back up. The source of
record is the GitHub repository; releases are published to npm from it.

## Known gaps

Reviewed 2026-09-02. Findings are in
`ambitiousmachines-assurance/reports/envradar/20260902.md`.

- The Action installs the `latest` published version of `envradar` unless the caller sets the `version` input, so a release can change behaviour under an existing workflow. Pin a version in your workflow until the default is pinned here.
- "Tracked environment file `examples/demo/.env.staging`" and "Tracked environment file `examples/demo/.env.production`": the demo ships two sample `.env` files with placeholder values so `envradar scan examples/demo` works out of the box. They hold no real secrets. Whether they stay tracked is an open decision.
- No automated test asserts that the CLI makes no network calls; the claim above rests on reading the imports.
