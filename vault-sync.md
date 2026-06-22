---
name: vault-sync
description: >
  Manually-invoked spec for syncing code/content from an experimental dev folder
  to a dedicated release-grade folder. NOT for Obsidian vaults — here "vault"
  means a project directory / git repository. Two modes auto-detected by whether
  the target exists: Bootstrap (target does not exist; create with clean
  structure + README) and Update (target exists; copy changed files + refresh
  README's Version History). Trigger phrases: "use vault-sync", "follow
  vault-sync", "sync to release", "promote to release", "bootstrap release repo",
  "update release repo from <source>".
---

# vault-sync

A reusable spec for promoting experimental work to a release-grade repository
under `D:\GitHub\`. Generalizes the manual flow of `VibeCoding/<subproject>` →
`<dedicated release repo>`.

## Glossary

In this skill the word **"vault"** means **a project folder / git repository**.
It does **NOT** mean an Obsidian vault. Examples:

- **Source vault** = experimental dev folder
  e.g. `D:\GitHub\VibeCoding\browser-extensions\enhanced-split-view`
- **Target vault** = dedicated release-grade folder
  e.g. `D:\GitHub\chrome-enhancedsplitview`

## When to use

Invoke when the user wants to:
- Promote a working version from a scratch/experimental folder to a release repo
- Bootstrap a brand-new release repo from existing experimental content
- Apply changes (including version bumps) from an experimental folder to an
  already-existing release repo and refresh its README
- Says any trigger phrase listed in frontmatter

## When NOT to use

- For Obsidian vault note-taking (different skill needed)
- For auto-running without explicit user request
- For pure single-repo edits (use Edit tool directly)
- For git commits / pushes / tags (the skill stops short of git; user runs git manually)
- For dependency installs, builds, deployments

## Invocation contract (REQUIRED questions)

When invoked, the agent MUST ask the user for these inputs. Do not infer them
from context, even if the current `workdir` looks like a good candidate. Always
ask:

1. **Source vault path** — absolute path to the experimental dev folder
   - Helpful: suggest current `workdir` if it sits under `D:\GitHub\`
   - Helpful: list visible folders under `D:\GitHub\VibeCoding\` if relevant
2. **Target vault path** — absolute path to the release-grade folder
   - Helpful: list sibling folders of source's grandparent under `D:\GitHub\`
   - Helpful: if the source name suggests a release counterpart
     (e.g. `enhanced-split-view` → `chrome-enhancedsplitview`), surface that as
     a guess but require confirm

After collecting these, run pre-flight checks and announce the detected mode
(Bootstrap or Update) before doing any work.

## Mode detection

After source + target are confirmed:

| Target state | Mode |
|---|---|
| Does NOT exist (or exists but is empty) | **Bootstrap** |
| Exists and contains files | **Update** |

If the target exists but contains only `.git/` (a freshly `git init`-ed empty
repo), treat as Bootstrap and warn user before writing.

Always announce the detected mode to the user and request explicit confirm
before any file write.

## Project type detection

Scan the source vault for distinguishing files:

| File / signal | Project type |
|---|---|
| `*.user.js` containing `// ==UserScript==` | Tampermonkey userscript |
| `manifest.json` with `manifest_version` key | Chrome / Firefox extension |
| `package.json` | Node.js project |
| `*.csproj` or `*.sln` | .NET |
| `Cargo.toml` | Rust crate |
| `pyproject.toml` or `setup.py` | Python |
| `project.godot` | Godot project |
| (none of above) | Generic |

Project type informs:
- Which files matter for sync (e.g. userscript = the `.user.js` + README + LICENSE)
- Where the version string lives (e.g. `@version` line vs `"version": ...`)
- Which README template flavor to use for Bootstrap

## Workflow — Bootstrap mode (target does NOT exist)

### Step 1 — Pre-checks (read-only)
- `Test-Path` source → must be an existing directory
- `Test-Path` target's parent → must exist
- `Test-Path` target → if exists and non-empty, refuse and ask user
- Detect project type from source

### Step 2 — Plan
- Enumerate files in source, filtered by the default ignore list (see below)
- Generate proposed README content from template (per project type)
- Detect version string from source (per project type)
- Show user:
  - File count + sample of top files
  - Generated README preview (first 30 lines)
  - Detected version
- Wait for explicit user confirm

### Step 3 — Execute (write phase)
- `New-Item -ItemType Directory -Path <target>`
- For each non-ignored file in source, copy preserving structure
- Write `README.md` to target (generated)
- If source has `LICENSE`, ask user before copying it; offer MIT/Apache/etc.
  template if user wants different
- Do NOT initialize git (`.git/`). Mention to user as a follow-up step

### Step 4 — Verify
- Count files copied; report
- For key files (especially the version-bearing one), compare hashes
  between source and target → must match
- For JS files: run `node --check`
- Read first 30 lines of new README for visual confirmation

### Step 5 — Report
- Target path
- File count copied
- README sections present
- Suggested next steps for user (e.g. "run `git init` in target if needed")

## Workflow — Update mode (target EXISTS)

### Step 1 — Pre-checks (read-only)
- `Test-Path` both paths
- Source ≠ target
- Detect project type from source
- If target is a git repo: capture current `git status --short` for later
  comparison (don't modify git state)

### Step 2 — Detect version bump
- Extract version from source per project type
- Extract version from target's equivalent file
- If source > target → version bump detected (note for README update step)

### Step 3 — Diff
- For each non-ignored file in source, hash it
- For corresponding file in target, hash it (if exists)
- Build three lists:
  - **NEW** — exists in source, not in target
  - **MODIFIED** — exists in both, hashes differ
  - **DELETED** — exists in target, not in source (do NOT auto-delete; flag for user)

### Step 4 — Show plan
Present to user:
- Version bump status (or "no version change")
- NEW file count + names
- MODIFIED file count + names
- DELETED file count + names (with note: skill will NOT delete automatically)
- Proposed README "Version History" update (only if version bumped)
- Wait for explicit user confirm

### Step 5 — Execute (write phase)
- Copy NEW files (preserve structure)
- Overwrite MODIFIED files
- For each DELETED file: ask user one-by-one; never bulk-delete
- If version bumped:
  - Locate `### v<old> (Latest)` line in target's `README.md`
  - Replace with new `### v<new> (Latest)` block + bullets (ask user for
    bullets or extract from session context if recently discussed)
  - Demote previous "(Latest)" tag — remove "(Latest)" from the old version
    heading and preserve its body

### Step 6 — Verify
- Hash match each copied file (source vs target) → must match
- For JS files: `node --check`
- For README: confirm new version section is present
- `git -C <target> status --short` → show user what's modified

### Step 7 — Report
- Files copied (count + names)
- Version bump detected (or not)
- README updated (or not)
- Remind user: skill does NOT commit/push; they handle git manually
- Suggest commit message style if helpful (concise + per-WI summary)

## README templates

### Bootstrap — Tampermonkey userscript flavor

```md
# {ProjectName}

{One-line description, sourced from script `@description` or source README}

## 🚀 Quick Start

1. **Install** the userscript using [Tampermonkey](https://www.tampermonkey.net)
   or [install directly]({raw-url-placeholder})
2. {Setup steps — placeholder, edit after Bootstrap}
3. {Usage — placeholder}

## 📝 Version History

### v{version} (Latest)
- Initial release

## 🎯 Key Features

- {Auto-extract from `@description` or source README}

## License

See `LICENSE`.

---

[Report Issues]({issues-url-placeholder}) | [View on GitHub]({repo-url-placeholder})
```

### Bootstrap — Browser extension flavor

```md
# {ExtensionName}

{One-line description from `manifest.json` description field}

## Installation

1. Download or clone this repository
2. Open `chrome://extensions` (or `about:debugging` for Firefox)
3. Enable Developer Mode
4. Load unpacked → select this folder

## Version

Current: v{version} (from `manifest.json`)

## Features

- {From manifest description or auto-extract}

## License

See `LICENSE`.
```

### Bootstrap — Generic flavor

```md
# {ProjectName}

{Description placeholder}

## Installation

{TBD}

## Usage

{TBD}

## Version History

### v{version} (Latest)
- Initial release

## License

See `LICENSE`.
```

### Update — Version History prepend template

When the source version differs from target, transform target's README:

**Find:**
```
### v{old} (Latest)
- {bullet}
- {bullet}
```

**Replace with:**
```
### v{new} (Latest)
- {new bullet 1, from user input or session context}
- {new bullet 2}

### v{old}
- {original bullet}
- {original bullet}
```

Preserve all older version sections (v{old-1}, v{old-2}, etc.) below, unchanged.

## Default ignore list (skip when copying)

```
.git/
node_modules/
dist/
build/
out/
.next/
.nuxt/
.cache/
.parcel-cache/
.vite/
*.log
*.tmp
.DS_Store
Thumbs.db
.vscode/
.idea/
__pycache__/
*.pyc
.pytest_cache/
.mypy_cache/
target/
bin/
obj/
```

`.gitignore` itself IS copied (it's a project artifact). `LICENSE` is copied
only with user confirm in Bootstrap mode (preserved in Update mode).

## Safety rails

- NEVER copy `.git/` (would replace target's git history)
- NEVER initialize git (`git init`) without user request
- NEVER commit, push, tag, or otherwise alter git state
- NEVER overwrite a target file without first showing diff or hash mismatch
- NEVER bulk-delete files in target on DELETED list — always ask per-file
- For Bootstrap into a non-empty target → refuse, ask user how to proceed
- For Update with no detected changes → report "no-op" and exit cleanly
- ALWAYS read-back-verify hash after each file copy (source vs target match)
- ALWAYS preserve target's existing `LICENSE` unless user explicitly approves
- ALWAYS preserve target's existing `.gitignore` if it differs from source
  (offer merge instead of overwrite)

## Verification helpers (PowerShell snippets the agent may use)

File hash compare:
```powershell
$src = (Get-FileHash -LiteralPath $sourcePath -Algorithm MD5).Hash
$tgt = (Get-FileHash -LiteralPath $targetPath -Algorithm MD5).Hash
if ($src -eq $tgt) { "HASH OK" } else { "HASH MISMATCH" }
```

JS syntax check:
```powershell
node --check $jsFilePath; if ($?) { "SYNTAX OK" }
```

Target git status:
```powershell
git -C $targetPath status --short
```

Recursive copy (single file, preserving structure):
```powershell
Copy-Item -LiteralPath $src -Destination $dst -Force
```

## Example invocations

### Example 1 — Update (version bump from session work)

User: *"Use vault-sync to push my v1.2.0 work from
`D:\GitHub\VibeCoding\browser-extensions\enhanced-split-view` to
`D:\GitHub\chrome-enhancedsplitview`."*

Agent:
1. Confirms source path and target path with user
2. Detects: target exists → Update mode
3. Detects: project type = Tampermonkey userscript
4. Extracts source `@version 1.2.0` vs target `@version 1.1.0` → version bump
5. Hashes files, builds diff: 1 MODIFIED (`.user.js`), 1 MODIFIED (`README.md`)
6. Shows user the diff plan + proposed v1.2.0 README entry (asks for bullets
   if session context doesn't have them)
7. On confirm: copies `.user.js`, edits `README.md` Version History
8. Verifies hashes + `node --check` + `git status` in target
9. Reports: "2 files synced, v1.2.0 README entry added, target git shows 2
   modified files staged for your manual commit"

### Example 2 — Bootstrap (new release repo)

User: *"Bootstrap a new release repo at `D:\GitHub\my-new-tool` from
`D:\GitHub\VibeCoding\tools\my-new-tool`."*

Agent:
1. Confirms both paths
2. Detects: target does NOT exist → Bootstrap mode
3. Detects: project type = Node.js (`package.json` present)
4. Plans: list of 12 files to copy (excluding `node_modules`, `dist`)
5. Generates README from generic template, populated with name + version
6. Shows user the file list + README preview, asks for confirm
7. On confirm: creates target dir, copies files, writes README
8. Verifies file count + key hashes + `node --check` on `.js` files
9. Reports: "Target created at D:\GitHub\my-new-tool with 12 files + README.
   Suggested next: `cd D:\GitHub\my-new-tool; git init; git add .` (manual)"

## Notes for future maintainers

- This skill lives at `D:\GitHub\vault-sync.md` (NOT under `.codemaker/`)
- It is NOT auto-discovered by CodeMaker — invoke by referencing the path
- Scope: any pair of folders under `D:\GitHub\`
- Single-file format chosen for portability + readability
- "Vault" terminology preserved from user; means project folder
- To extend with new project types: add detection rule + README template
- To extend with code-mirror or doc-sync features: consider a sibling skill
  rather than enlarging this one
