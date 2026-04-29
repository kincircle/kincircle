# KinCircle — agent guide

## Commit workflow

When you finish a logical unit of work, commit it. **Do not push** — the human reviews `git log origin/main..HEAD` and pushes when ready.

### Format

[Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>
```

- `type`: `feat`, `fix`, `docs`, `chore`, `refactor`, `perf`, `test`, `build`, `ci`
- `subject`: imperative, lowercase, no trailing period

### Scopes

| Scope | Covers |
| --- | --- |
| `api` | `src/app/api/**` (route handlers) |
| `web` | `src/app/**` (non-api pages), `src/components/**` |
| `db` | `src/db/**` (schema, migrations) |
| `design` | `design-system/**` (HTML mocks, tokens, CSS) |
| `infra` | `scripts/**`, build/deployment config |
| `docs` | `README.md`, deployment notes |

If a change crosses scopes, pick the dominant one or use a feature scope (e.g., `feat(potluck): ...`). Single-file utility changes under `src/lib/**` may use no scope.

### Discipline

- **One commit per logical change.** Don't bundle unrelated edits. If you made several distinct changes, make several distinct commits before stopping.
- **Commit at task completion**, not on every file save. A "task" is a logically coherent unit (one feature, one fix, one rename pass).
- **Never run `git push`** unless the human explicitly asks. Pushing is the human's review checkpoint.
- **Never force-push, amend pushed commits, or rewrite shared history.**

### Trailer

End each commit message with:

```
Co-Authored-By: <agent identity> <noreply@anthropic.com>
```
