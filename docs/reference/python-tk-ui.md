# Optional Python `tk-ui`

The repository includes a small Textual app in `python/tk_ui`.

## Purpose

`tk-ui` is a Kanban-style viewer for `.tickets/` directories managed by `tk`.

## Install

From `python/`:

```bash
uv sync
```

Or install the package:

```bash
uv tool install ./python
```

## Run

```bash
uv run tk-ui
```

Or point it at a repo explicitly:

```bash
uv run tk-ui /path/to/project
```

## Main controls

| Key | Action |
| --- | --- |
| `q` | Quit |
| `r` | Refresh |
| `o` | Open ticket in pager/editor |
| `e` | Expand or collapse description |
| `?` | Help |
| `Tab` / `Shift+Tab` | Move between columns |
| `↑` / `↓` | Move within a column |
| `Enter` | Select ticket |

## Board columns

- **Ready** — `ready`, `todo`
- **Blocked** — `blocked` or unresolved dependencies
- **In Progress** — `in-progress`
- **Closed** — `closed`, `done`
