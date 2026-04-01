"""Entry point for tk-ui: launch the ticket board viewer."""

from __future__ import annotations

import sys


def main(argv: list[str] | None = None) -> int:
    """Launch the ticket board TUI."""
    # Check dependencies before importing app
    missing_deps = []

    try:
        import textual  # noqa: F401
    except ImportError:
        missing_deps.append("textual>=0.47.0")

    try:
        import yaml  # noqa: F401
    except ImportError:
        missing_deps.append("pyyaml>=6.0")

    if missing_deps:
        print("Error: UI dependencies not installed.", file=sys.stderr)
        print("", file=sys.stderr)
        print("Missing packages:", file=sys.stderr)
        for dep in missing_deps:
            print(f"  - {dep}", file=sys.stderr)
        print("", file=sys.stderr)
        print("Install with:", file=sys.stderr)
        print("  cd python && uv sync", file=sys.stderr)
        return 1

    from tk_ui.app import TicketBoardApp

    app = TicketBoardApp()
    app.run()
    return 0


if __name__ == "__main__":
    sys.exit(main())
