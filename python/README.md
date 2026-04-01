# tk-ui

A Kanban-style ticket viewer TUI for tickets managed by [tk](https://github.com/wedow/ticket) — the git-backed issue tracker for AI agents.

Built with [Textual](https://textual.textualize.io/).

## Requirements

- [tk](https://github.com/wedow/ticket) — the ticket system that creates and manages `.tickets/` files
- Python 3.11+

## Install

```bash
pip install tk-ui
```

Or with uv:

```bash
uv tool install tk-ui
```

## Usage

Run from any directory that contains a `.tickets/` folder with markdown ticket files:

```bash
tk-ui
```

Or specify a path:

```bash
tk-ui /path/to/project
```

### Ticket Format

Tickets are `.md` files in `.tickets/` with YAML frontmatter:

```markdown
---
id: TODO-abc123
title: My ticket
status: in-progress
priority: high
dependencies: []
---

Ticket description here.
```

### Board Columns

| Column | Tickets with status |
|--------|-------------------|
| **Ready** | `ready`, `todo` |
| **Blocked** | `blocked` or has unresolved dependencies |
| **In Progress** | `in-progress` |
| **Closed** | `closed`, `done` |

### Key Bindings

| Key | Action |
|-----|--------|
| `q` | Quit |
| `r` | Refresh board |
| `o` | Open ticket in editor |
| `e` | Expand/collapse description |
| `?` | Show help |
| Tab / Shift+Tab | Cycle focus between columns |
| ↑ / ↓ | Navigate tickets |
| Enter | Select ticket |

## Acknowledgements

- [tk (ticket)](https://github.com/wedow/ticket) — the git-backed issue tracker this viewer is built for
- [Textual](https://textual.textualize.io/) — the Python TUI framework

## License

MIT
