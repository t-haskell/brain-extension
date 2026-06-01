import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { FocusTimer } from "../../src/components/FocusTimer";
import { createTask } from "../../src/domain/rules";

describe("FocusTimer", () => {
  test("moves focus into the dialog and closes with Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const focusTask = createTask({ title: "Draft memo", status: "active", focus: true }, new Date("2026-04-29T12:00:00Z"));

    render(<FocusTimer focusTask={focusTask} onClose={onClose} onChooseFocus={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Close focus timer" })).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalled();
  });
});
