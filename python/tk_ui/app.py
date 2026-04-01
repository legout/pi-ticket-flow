"""Textual TUI for pi-ticket-flow — Kanban ticket board viewer."""

from __future__ import annotations

import logging
import os
import shlex
import shutil
import subprocess
from pathlib import Path
from typing import Optional

from tk_ui.board_classifier import BoardClassifier, BoardColumn, ClassifiedTicket, BoardView

# Textual imports
from textual.app import App, ComposeResult
from textual.widgets import (
    Static, Header, Footer, ListView, ListItem, Label,
    Input, Button
)
from textual.containers import Horizontal, Vertical, VerticalScroll
from textual.reactive import reactive
from textual.binding import Binding

logger = logging.getLogger(__name__)


def open_file(widget: Static, file_path: Path) -> None:
    """Open a file using EDITOR/PAGER without invoking a shell."""
    if not file_path.exists():
        widget.notify(f"File not found: {file_path}", severity="error")
        return

    editor = os.environ.get("EDITOR", "").strip()
    pager = os.environ.get("PAGER", "").strip()

    cmd_parts = None
    for configured_cmd in (editor, pager):
        if not configured_cmd:
            continue
        try:
            cmd_parts = shlex.split(configured_cmd) + [str(file_path)]
        except ValueError:
            cmd_parts = [configured_cmd, str(file_path)]
        break

    if not cmd_parts:
        for fallback in ("less", "more", "cat"):
            if shutil.which(fallback):
                cmd_parts = [fallback, str(file_path)]
                break

    if not cmd_parts:
        widget.notify("No pager or editor found. Set $PAGER or $EDITOR.", severity="error")
        return

    try:
        with widget.app.suspend():
            result = subprocess.run(cmd_parts, check=False)
            exit_code = result.returncode
    except Exception as e:
        widget.notify(f"Failed to suspend terminal: {e}", severity="error")
        return

    if exit_code != 0:
        widget.notify(f"Command failed (exit code: {exit_code})", severity="error")


class DataListItem(ListItem):
    """ListItem that can store arbitrary data."""
    def __init__(self, *children, data=None, **kwargs):
        super().__init__(*children, **kwargs)
        self.data = data


class TicketBoard(Static):
    """Widget for displaying Kanban-style ticket board."""

    board_view: reactive[Optional[BoardView]] = reactive(None)
    selected_ticket: reactive[Optional[ClassifiedTicket]] = reactive(None)

    # Filter state
    search_query: reactive[str] = reactive("")
    tag_filter: reactive[str] = reactive("")
    assignee_filter: reactive[str] = reactive("")

    # Description display state
    show_full_description: reactive[bool] = reactive(False)
    DESCRIPTION_LIMIT: int = 2500

    def compose(self) -> ComposeResult:
        """Compose the ticket board layout."""
        with Horizontal():
            # Left side: Board columns
            with Vertical(id="board-container"):
                yield Static("[b]Ticket Board[/b]", id="board-header")

                # Filter bar
                with Horizontal(id="filter-bar"):
                    yield Input(placeholder="Search title/body...", id="search-input")
                    yield Input(placeholder="Tag...", id="tag-filter")
                    yield Input(placeholder="Assignee...", id="assignee-filter")
                    yield Button("Clear", id="clear-filters", variant="primary")

                with Horizontal(id="board-columns"):
                    # Four columns: Ready, Blocked, In Progress, Closed
                    with VerticalScroll(id="col-ready", classes="board-column"):
                        yield Static("[green]READY[/green]", classes="column-header")
                        yield ListView(id="list-ready")

                    with VerticalScroll(id="col-blocked", classes="board-column"):
                        yield Static("[red]BLOCKED[/red]", classes="column-header")
                        yield ListView(id="list-blocked")

                    with VerticalScroll(id="col-in-progress", classes="board-column"):
                        yield Static("[yellow]IN PROGRESS[/yellow]", classes="column-header")
                        yield ListView(id="list-in-progress")

                    with VerticalScroll(id="col-closed", classes="board-column"):
                        yield Static("[dim]CLOSED[/dim]", classes="column-header")
                        yield ListView(id="list-closed")

            # Right side: Ticket detail panel
            with Vertical(id="ticket-detail-panel"):
                yield Static("[b]Ticket Detail[/b]", id="detail-header")
                yield VerticalScroll(Static("Select a ticket to view details", id="ticket-detail-content"), id="detail-scroll")

    def on_mount(self) -> None:
        """Load tickets when mounted."""
        self.load_tickets()

    def load_tickets(self) -> None:
        """Load and classify tickets from disk."""
        try:
            classifier = BoardClassifier()
            self.board_view = classifier.classify_all()
            self.update_board()
            self.update_detail_counts()
        except Exception as e:
            self._show_error(f"Error loading tickets: {e}")

    def _show_error(self, message: str) -> None:
        """Display an error message."""
        for col_id in ["list-ready", "list-blocked", "list-in-progress", "list-closed"]:
            list_view = self.query_one(f"#{col_id}", ListView)
            list_view.clear()
        self.query_one("#ticket-detail-content", Static).update(f"[red]{message}[/red]")

    def on_input_changed(self, event: Input.Changed) -> None:
        """Handle filter input changes."""
        input_id = event.input.id
        if input_id == "search-input":
            self.search_query = event.value
        elif input_id == "tag-filter":
            self.tag_filter = event.value.lower()
        elif input_id == "assignee-filter":
            self.assignee_filter = event.value.lower()
        self.update_board()

    def on_button_pressed(self, event: Button.Pressed) -> None:
        """Handle button presses."""
        if event.button.id == "clear-filters":
            self._clear_filters()

    def _clear_filters(self) -> None:
        """Clear all filter inputs."""
        self.search_query = ""
        self.tag_filter = ""
        self.assignee_filter = ""

        self.query_one("#search-input", Input).value = ""
        self.query_one("#tag-filter", Input).value = ""
        self.query_one("#assignee-filter", Input).value = ""

        self.notify("Filters cleared")
        self.update_board()

    def _apply_filters(self, tickets: list[ClassifiedTicket]) -> list[ClassifiedTicket]:
        """Apply all active filters to the ticket list."""
        filtered = tickets

        # Search query (title, body, or ID)
        if self.search_query:
            query = self.search_query.lower()
            filtered = [
                ct for ct in filtered
                if query in ct.id.lower()
                or query in ct.ticket.title.lower()
                or query in ct.ticket.body.lower()
            ]

        # Tag filter
        if self.tag_filter:
            filtered = [
                ct for ct in filtered
                if any(self.tag_filter in tag.lower() for tag in ct.ticket.tags)
            ]

        # Assignee filter
        if self.assignee_filter:
            filtered = [
                ct for ct in filtered
                if ct.ticket.assignee and self.assignee_filter in ct.ticket.assignee.lower()
            ]

        return filtered

    def update_detail_counts(self) -> None:
        """Update the board header with ticket counts."""
        if not self.board_view:
            return
        counts = self.board_view.counts
        header = self.query_one("#board-header", Static)
        header.update(
            f"[b]Ticket Board[/b] | "
            f"[green]Ready: {counts['ready']}[/green] | "
            f"[red]Blocked: {counts['blocked']}[/red] | "
            f"[yellow]In Progress: {counts['in_progress']}[/yellow] | "
            f"[dim]Closed: {counts['closed']}[/dim]"
        )

    def update_board(self) -> None:
        """Update all board columns with tickets."""
        if not self.board_view:
            return

        column_map = {
            BoardColumn.READY: "list-ready",
            BoardColumn.BLOCKED: "list-blocked",
            BoardColumn.IN_PROGRESS: "list-in-progress",
            BoardColumn.CLOSED: "list-closed",
        }

        for column, list_id in column_map.items():
            list_view = self.query_one(f"#{list_id}", ListView)
            list_view.clear()

            tickets = self.board_view.get_by_column(column)
            tickets = self._apply_filters(tickets)

            # Show empty state if no tickets after filtering
            if not tickets:
                list_view.append(ListItem(
                    Label("[dim]No tickets[/dim]"),
                    disabled=True
                ))
                continue

            for ct in tickets:
                title = ct.title[:35] + "..." if len(ct.title) > 35 else ct.title
                priority_indicator = f"[P{ct.ticket.priority}] " if ct.ticket.priority else ""
                label_text = f"{priority_indicator}{ct.id}: {title}"

                list_view.append(DataListItem(
                    Label(label_text),
                    data=ct
                ))

    def on_list_view_selected(self, event: ListView.Selected) -> None:
        """Handle ticket selection from any column."""
        item = event.item
        if hasattr(item, "data") and item.data:
            self.selected_ticket = item.data
            self.update_detail_view()

    def update_detail_view(self) -> None:
        """Update the detail view for selected ticket."""
        if not self.selected_ticket:
            return

        ct = self.selected_ticket
        ticket = ct.ticket
        content = self.query_one("#ticket-detail-content", Static)

        status_color = {
            BoardColumn.READY: "green",
            BoardColumn.BLOCKED: "red",
            BoardColumn.IN_PROGRESS: "yellow",
            BoardColumn.CLOSED: "dim",
        }.get(ct.column, "white")

        lines = [
            f"[b]{ticket.title}[/b]",
            "",
            f"ID: {ticket.id}",
            f"Status: {ticket.status}",
            f"Column: [{status_color}]{ct.column.value.upper()}[/{status_color}]",
        ]

        if ticket.ticket_type:
            lines.append(f"Type: {ticket.ticket_type}")
        if ticket.priority:
            lines.append(f"Priority: {ticket.priority}")
        if ticket.assignee:
            lines.append(f"Assignee: @{ticket.assignee}")
        if ticket.external_ref:
            lines.append(f"External: {ticket.external_ref}")

        if ticket.tags:
            lines.append(f"Tags: {', '.join(ticket.tags)}")

        if ticket.deps:
            lines.append("")
            lines.append("[b]Dependencies:[/b]")
            for dep in ticket.deps:
                is_blocking = dep in ct.blocking_deps
                color = "red" if is_blocking else "dim"
                status_indicator = " [BLOCKING]" if is_blocking else ""
                lines.append(f"  • [{color}]{dep}[/{color}]{status_indicator}")

        lines.append("")
        lines.append("[b]Description:[/b] [dim](Press 'e' to expand/collapse)[/dim]")

        if self.show_full_description:
            body = ticket.body if ticket.body else "(no description)"
        else:
            limit = self.DESCRIPTION_LIMIT
            body = ticket.body[:limit] if ticket.body else "(no description)"
            if len(ticket.body) > limit:
                body += "\n\n[i](truncated... press 'e' to expand)[/i]"
        lines.append(body)

        content.update("\n".join(lines))

    def action_toggle_description(self) -> None:
        """Toggle between truncated and full description view."""
        self.show_full_description = not self.show_full_description
        self.update_detail_view()

    def action_open_in_editor(self) -> None:
        """Open selected ticket file in editor."""
        if not self.selected_ticket:
            self.notify("No ticket selected", severity="warning")
            return

        file_path = self.selected_ticket.ticket.file_path
        self._open_file(file_path)

    def _open_file(self, file_path: Path) -> None:
        """Open a file using EDITOR/PAGER."""
        open_file(self, file_path)


class TicketBoardApp(App):
    """Textual app for the ticket board viewer."""

    CSS_PATH = "styles.tcss"

    BINDINGS = [
        Binding("q", "quit", "Quit"),
        Binding("r", "refresh", "Refresh"),
        Binding("o", "open_ticket", "Open Ticket"),
        Binding("e", "expand_desc", "Expand Desc"),
        Binding("?", "help", "Help"),
    ]

    def compose(self) -> ComposeResult:
        """Compose the app layout."""
        yield Header()
        yield TicketBoard()
        yield Footer()

    def action_refresh(self) -> None:
        """Refresh the ticket board."""
        ticket_board = self.query_one(TicketBoard)
        ticket_board.load_tickets()
        self.notify("Tickets refreshed")

    def action_open_ticket(self) -> None:
        """Open the selected ticket in editor."""
        ticket_board = self.query_one(TicketBoard)
        ticket_board.action_open_in_editor()

    def action_expand_desc(self) -> None:
        """Toggle description expand."""
        ticket_board = self.query_one(TicketBoard)
        ticket_board.action_toggle_description()

    def action_help(self) -> None:
        """Show help dialog."""
        help_text = """[b]Keyboard Shortcuts[/b]

  q        Quit
  r        Refresh tickets
  o        Open ticket in editor
  e        Expand/collapse description
  ?        Show this help

[b]Navigation[/b]
  Tab      Move focus
  ↑/↓      Navigate lists
  Enter    Select item
"""
        self.notify(help_text, timeout=10)


def main() -> int:
    """Main entry point for the app."""
    app = TicketBoardApp()
    app.run()
    return 0


if __name__ == "__main__":
    import sys
    sys.exit(main())
